/* eslint-disable no-prototype-builtins */
import { LightningElement, track } from "lwc";
import getHierarchyRecords from "@salesforce/apex/HierarchyController.getHierarchyRecords";
import getHierarchyRecordsCount from "@salesforce/apex/HierarchyController.getHierarchyRecordCount";
// import { deepCopy } from "../utilsPrivate/utility";
export default class HierarchyComponent extends LightningElement {
    @track items = [];
    recordsLimitPerBatch = 2;
    selectedItem = null;
    @track recordIdToNumberOfChildPages = new Map();
    @track recordIdToCurrentPage = new Map();
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

    async loadMoreRecords(event) {
        let nodename = event.detail.nodename;
        this.recordIdToCurrentPage.set(
            nodename,
            this.recordIdToCurrentPage.get(nodename) + 1
        );
        await this.getData("Account", nodename);
    }

    addChildrenToRow(data, rowName, children) {
        return data.map((row) => {
            if (row.name === rowName) {
                // console.log("Adding children to: " + row.label);
                // console.log("new children: ", children);
                let items = [...row.items, ...children];
                if (items[0] === "") {
                    items.shift();
                }
                // console.log("Original items: ", row.items);
                // console.log("new items: ", items);
                return {
                    ...row,
                    items: items,
                    expanded: true,
                    maximumChildPages:
                        this.recordIdToNumberOfChildPages.get(rowName), //TO Change!!! this is bad. this field defines how many children do we have at all.
                    currentPage: this.recordIdToCurrentPage.get(rowName)
                };
            }

            return {
                ...row,
                items:
                    row.items &&
                    row.items.length > 0 &&
                    this.addChildrenToRow(row.items, rowName, children)
            };
        });
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
    async getInitialData(objectName, parentId) {
        await this.addPaginationInfo(objectName, parentId);
        this.getData(objectName, parentId);
    }
    async getData(objectName, parentId) {
        let retrievedData = await this.getFormattedChildData(
            objectName,
            parentId
        );
        if (parentId) {
            this.items = this.addChildrenToRow(
                this.items,
                parentId,
                retrievedData
            );
        } else {
            this.items =
                this.items.length === 0
                    ? retrievedData
                    : [...this.items, ...retrievedData];
        }
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
                currentPage: 0
            };
        });
        return retrievedData;
    }

    handleSelect(event) {
        this.selectedItem = event.detail.name;
    }
}
