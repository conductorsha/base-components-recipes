/*
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { LightningElement, api, track } from "lwc";
import { TreeData } from "./treeData";
import { keyCodes, deepCopy } from "c/utilsPrivate";

export default class cTree extends LightningElement {
    @api header;
    @api rootInfo;
    @track _currentFocusedItem = null;
    @track _childNodes;
    @track _key;
    @track _focusedChild = null;
    @track _items = [];
    _defaultFocused = { key: "1", parent: "0" };
    _focusedItemName = null;
    @track _focusedItem = null;
    hasDetachedListeners = true;

    constructor() {
        super();
        this.callbackMap = {};
        this.treedata = null;
        this.template.addEventListener(
            "privateitemkeydown",
            this.handleKeydown.bind(this)
        );

        this.template.addEventListener(
            "privateitemclick",
            this.handleClick.bind(this)
        );

        this.template.addEventListener(
            "privateregisteritem",
            this.handleRegistration.bind(this)
        );
    }

    @api get items() {
        return this._items || [];
    }

    set items(value) {
        this.normalizeData(value);
    }

    @api get focusedItemName() {
        return this._focusedItemName;
    }

    set focusedItemName(value) {
        this._focusedItemName = value;
        this.syncFocused();
    }

    get children() {
        return this._childNodes;
    }

    get rootElement() {
        return this._key;
    }

    get focusedChild() {
        return this._focusedChild;
    }

    //if the treedata exists and _childNodes already populated we can synchronize focusedItemName.
    syncFocused() {
        //the parameters passing works asynchronously. we should be careful with how we set up the paramenters.
        if (this.treedata && this._childNodes.length > 0) {
            this._focusedItem = this.treedata.syncFocusedToData(
                this.focusedItemName
            );
            this.syncCurrentFocused();
            if (this._focusedItem === null) {
                this.setFocusToItem(this._currentFocusedItem, false, false);
            }
        }
    }

    normalizeData(items) {
        if (items) {
            this.treedata = new TreeData(); //START. create initial tree and initialize elements there
            this._items = items.map((item) => {
                return this.treedata.cloneItems(item);
            }); //create copy of the items

            const treeRoot = this.treedata.parse(
                this.items,
                this.focusedItemName
            ); //creates the real tree with copy of the initial nodes but with marked keys, info about leafs and other staff
            this._childNodes = treeRoot ? treeRoot.children : []; // receive the childNodes in form of the tree item
            this._focusedItem = treeRoot.focusedItem; //returns info about focused node in special format: key, parent, name and reference to real node object
            this._key = this._childNodes.length > 0 ? treeRoot.key : null; // for tree it should be 0
            if (this._key) {
                this.syncCurrentFocused(); // update the current focused item
            }
        }
    }

    syncCurrentFocused() {
        if (this._focusedItem) {
            this._currentFocusedItem = this._focusedItem;
        } else {
            this._currentFocusedItem = this._defaultFocused;
        }
        this.updateCurrentFocusedChild();
    }

    updateCurrentFocusedChild() {
        //updating currentfocusedchild. IDK  what it does :/ TODO!!
        if (this._key === this._currentFocusedItem.parent) {
            this._focusedChild = this.treedata.getChildNum(
                this._currentFocusedItem.key
            );
        } else {
            this._focusedChild = this._currentFocusedItem.key;
            this.treedata.updateCurrentFocusedChild(
                this._currentFocusedItem.key
            );
        }
    }

    handleTreeFocusIn(event) {
        const relatedTarget = event.relatedTarget;
        if (
            this._currentFocusedItem &&
            relatedTarget &&
            relatedTarget.tagName !== "C-TREE-ITEM"
        ) {
            this.setFocusToItem(this._currentFocusedItem, false);
        }
    }

    renderedCallback() {
        if (this._focusedItem) {
            this.setFocusToItem(this._currentFocusedItem, false);
        }
        if (this.hasDetachedListeners) {
            const container = this.template.querySelector(
                ".slds-tree_container"
            );

            container.addEventListener(
                "focus",
                this.handleTreeFocusIn.bind(this)
            );

            this.hasDetachedListeners = false;
        }
    }

    disconnectedCallback() {
        this.hasDetachedListeners = true;
    }

    handleClick(event) {
        const key = event.detail.key;
        const target = event.detail.target;
        const item = this.treedata.getItem(key);
        if (item) {
            if (target === "chevron") {
                if (item.treeNode.nodeRef.expanded) {
                    this.collapseBranch(item.treeNode);
                } else {
                    this.expandBranch(item.treeNode);
                }
            } else if (target === "filterSelectionCheckbox") {
                this.dispatchSelectedEvent(item.treeNode);
            } else {
                // this._focusedItem = item; //NOT needed??
                this.dispatchFocusEvent(item.treeNode);
                // this.setFocusToItem(item); //NOT needed??
                // console.log("Tree. handleClick finish."); // NOT needed??
            }
        }
    }
    expandBranch(node) {
        if (!node.isLeaf && !node.isDisabled) {
            node.nodeRef.expanded = true;
            if (
                this._focusedItem &&
                this._focusedItem.key.startsWith(node.key)
            ) {
                // eslint-disable-next-line @lwc/lwc/no-async-operation
                setTimeout(() => {
                    this.setFocusToItem(this._focusedItem);
                }, 0);
            }

            this.dispatchEvent(
                new CustomEvent("expandcollapse", {
                    detail: {
                        itemName: node.name,
                        item: node,
                        eventName: "expand"
                    }
                })
            );
        }
    }

    collapseBranch(node) {
        if (!node.isLeaf && !node.isDisabled) {
            node.nodeRef.expanded = false;
            this.treedata.updateVisibleTreeItemsOnCollapse(node.key);

            this.dispatchEvent(
                new CustomEvent("expandcollapse", {
                    detail: {
                        item: node,
                        itemName: node.name,
                        eventName: "collapse"
                    }
                })
            );
        }
    }

    dispatchFocusEvent(node) {
        if (!node.isDisabled) {
            const customEvent = new CustomEvent("focus", {
                bubbles: true,
                composed: true,
                cancelable: true,
                detail: { name: node.name }
            });

            this.dispatchEvent(customEvent);
        }
    }
    dispatchSelectedEvent(node) {
        if (!node.isDisabled) {
            node.nodeRef.isCheckedForFilter = !node.nodeRef.isCheckedForFilter;
            const customEvent = new CustomEvent("selecteditem", {
                bubbles: true,
                composed: true,
                cancelable: true,
                detail: {
                    name: node.name,
                    label: node.label
                }
            });

            this.dispatchEvent(customEvent);
        }
    }
    handleKeydown(event) {
        event.preventDefault();
        event.stopPropagation();
        const item = this.treedata.getItem(event.detail.key);
        switch (event.detail.keyCode) {
            case keyCodes.up:
                this.setFocusToPrevItem();
                break;
            case keyCodes.down:
                this.setFocusToNextItem();
                break;
            case keyCodes.home:
                this.setFocusToFirstItem();
                break;
            case keyCodes.end:
                this.setFocusToLastItem();
                break;
            case keyCodes.right:
                this.expandBranch(item.treeNode);
                break;
            case keyCodes.left:
                if (item.treeNode.nodeRef.expanded && !item.treeNode.isLeaf) {
                    this.collapseBranch(item.treeNode);
                } else {
                    this.handleParentCollapse(event.detail.key);
                }
                break;

            default:
                break;
        }
    }

    setFocusToItem(item, shouldFocus = true, shouldSelect = true) {
        const currentFocused = this.treedata.getItemAtIndex(
            this.treedata.currentFocusedItemIndex
        );
        if (
            currentFocused &&
            currentFocused.key !== item.key &&
            this.callbackMap[currentFocused.parent]
        ) {
            this.callbackMap[currentFocused.key].unfocusCallback();
        }
        if (item) {
            this._currentFocusedItem =
                this.treedata.updateCurrentFocusedItemIndex(item.index);
            if (this.callbackMap[item.parent]) {
                this.callbackMap[item.parent].focusCallback(
                    item.key,
                    shouldFocus,
                    shouldSelect
                );
            }
        }
    }

    setFocusToNextItem() {
        const nextNode = this.treedata.findNextNodeToFocus();
        if (nextNode && nextNode.index !== -1) {
            this.setFocusToItem(nextNode);
        }
    }

    setFocusToPrevItem() {
        const prevNode = this.treedata.findPrevNodeToFocus();
        if (prevNode && prevNode.index !== -1) {
            this.setFocusToItem(prevNode);
        }
    }

    setFocusToFirstItem() {
        const node = this.treedata.findFirstNodeToFocus();
        if (node && node.index !== -1) {
            this.setFocusToItem(node);
        }
    }

    setFocusToLastItem() {
        const lastNode = this.treedata.findLastNodeToFocus();
        if (lastNode && lastNode.index !== -1) {
            this.setFocusToItem(lastNode);
        }
    }

    handleFocusFirst(event) {
        event.stopPropagation();
        this.setFocusToFirstItem();
    }

    handleFocusLast(event) {
        event.stopPropagation();
        this.setFocusToLastItem();
    }

    handleFocusNext(event) {
        event.stopPropagation();
        this.setFocusToNextItem();
    }

    handleFocusPrev(event) {
        event.stopPropagation();
        this.setFocusToPrevItem();
    }

    handleChildBranchCollapse(event) {
        event.stopPropagation();
        this.treedata.updateVisibleTreeItemsOnCollapse(event.detail.key);
    }

    handleParentCollapse(key) {
        const item = this.treedata.getItem(key);
        if (item && item.level > 1) {
            const parent = this.treedata.getItem(item.parent);
            this.collapseBranch(parent.treeNode);
            this.setFocusToItem(parent);
        }
    }

    handleRegistration(event) {
        const itemKey = event.detail.key;
        this.callbackMap[itemKey] = {
            focusCallback: event.detail.focusCallback,
            unfocusCallback: event.detail.unfocusCallback
        };

        this.treedata.addVisible(itemKey);
        event.stopPropagation();
    }

    get hasChildren() {
        return this._items && this._items.length > 0;
    }
}
