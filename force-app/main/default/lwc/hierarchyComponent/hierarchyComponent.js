/* eslint-disable no-prototype-builtins */
import { LightningElement, track } from "lwc";
import getHierarchyRecords from "@salesforce/apex/HierarchyController.getHierarchyRecords";
import getHierarchyRecordsCount from "@salesforce/apex/HierarchyController.getHierarchyRecordCount";
// import { deepCopy } from "../utilsPrivate/utility";
export default class HierarchyComponent extends LightningElement {
    @track items = [];
    recordsLimitPerBatch = 1;
    focusedItemName = null;
    @track recordIdToNumberOfChildPages = new Map();
    @track recordIdToCurrentPage = new Map();
    @track selectedItems = new Map();
    isTreeLoading = false;
    get rootInfo() {
        return {
            maximumChildPages: this.recordIdToNumberOfChildPages.get(null),
            currentPage: this.recordIdToCurrentPage.get(null)
        };
    }

    async connectedCallback() {
        this.isTreeLoading = true;
        await this.getInitialData("Account", null);
    }

    async handleToggle(event) {
        let { item, itemName, eventName } = event.detail;
        if (eventName === "expand") {
            if (item.children.length === 0) {
                this.isTreeLoading = true; //
                await this.getInitialData("Account", itemName);
            }
        }
    }
    async getInitialData(objectName, parentId) {
        await this.addPaginationInfo(objectName, parentId);
        this.getData(objectName, parentId);
    }

    async addPaginationInfo(objectName, recordId) {
        let countOfChildRecords = await getHierarchyRecordsCount({
            objectName: objectName,
            parentId: recordId
        });
        this.recordIdToNumberOfChildPages.set(
            recordId,
            Math.ceil(countOfChildRecords / this.recordsLimitPerBatch) - 1
        );
        this.recordIdToCurrentPage.set(recordId, 0);
    }

    async loadMoreRecords(event) {
        this.isTreeLoading = true;
        let nodename = event.detail.nodename;
        this.recordIdToCurrentPage.set(
            nodename,
            this.recordIdToCurrentPage.get(nodename) + 1
        );
        await this.getData("Account", nodename);
    }

    async getData(objectName, recordId) {
        let retrievedData = await this.getFormattedChildData(
            objectName,
            recordId
        );
        let newItems;
        if (recordId) {
            newItems = this.addChildrenToRow(
                this.items,
                recordId,
                retrievedData
            );
        } else {
            newItems = [...this.items, ...retrievedData];
        }
        this.items = this.getFreshItems(newItems);
        this.isTreeLoading = false;
    }

    async getFormattedChildData(objectName, parentId) {
        let retrievedData = await getHierarchyRecords({
            objectName: objectName,
            parentId: parentId,
            recordsPerBatch: this.recordsLimitPerBatch,
            batchNumber: this.recordIdToCurrentPage.get(parentId)
        });

        retrievedData = retrievedData.map((item) => {
            return {
                name: item.recordId,
                label: item.recordName,
                metatext: item.hierarchyLevel,
                items: [""],
                currentPage: 0,
                isCheckedForFilter: false
            };
        });
        return retrievedData;
    }

    addChildrenToRow(data, rowName, children) {
        return data.map((row) => {
            if (row.name === rowName) {
                if (row.items && row.items.length > 0 && row.items[0] === "") {
                    row.items.shift();
                }
                let existingChild = row.items.map((item) => ({
                    ...item,
                    isCheckedForFilter: this.selectedItems.has(item.name)
                }));
                let items = [...existingChild, ...children];

                return {
                    ...row,
                    items: items,
                    expanded: true
                };
            }

            return {
                ...row,
                items:
                    row.items && row.items[0] !== ""
                        ? this.addChildrenToRow(row.items, rowName, children)
                        : row.items
            };
        });
    }

    getFreshItems(finalItems) {
        return finalItems.map((item) => {
            return {
                ...item,
                maximumChildPages: this.recordIdToNumberOfChildPages.get(
                    item.name
                ),
                currentPage: this.recordIdToCurrentPage.get(item.name),
                isCheckedForFilter: this.selectedItems.has(item.name),
                items:
                    item.items && item.items[0] !== ""
                        ? this.getFreshItems(item.items)
                        : item.items
            };
        });
    }

    handleFocusItem(event) {
        this.focusedItemName = event.detail.name;
    }

    handleSectedItem(event) {
        const { name, label } = event.detail;
        if (this.selectedItems.has(name)) {
            this.selectedItems.delete(name);
        } else {
            this.selectedItems.set(name, label);
        }
    }
}
