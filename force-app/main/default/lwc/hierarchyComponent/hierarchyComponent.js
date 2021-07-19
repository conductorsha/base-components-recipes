/* eslint-disable no-prototype-builtins */
import { LightningElement, track } from "lwc";
import getHierarchyRecords from "@salesforce/apex/HierarchyController.getHierarchyRecords";
import getHierarchyRecordsCount from "@salesforce/apex/HierarchyController.getHierarchyRecordCount";
// import { deepCopy } from "../utilsPrivate/utility";
export default class HierarchyComponent extends LightningElement {
    @track items = [];
    recordsLimitPerBatch = 5;
    selectedItem = null;
    @track recordIdToNumberOfChildPages = new Map();
    isTreeLoading = false;

    async connectedCallback() {
        this.isTreeLoading = true;
        this.addPaginationInfo(null);
        this.getData("Account", null);
    }

    handleSelect(event) {
        this.selectedItem = event.detail.name;
    }

    async handleToggle(event) {
        this.isTreeLoading = true;
        let { itemName, eventName } = event.detail;
        this.addPaginationInfo(itemName);
        if (eventName === "expand") {
            this.getData("Account", itemName);
        }
    }

    async loadMoreRecords(event) {
        let { itemName } = event.detail;
        this.getData("Account", itemName);
    }

    addChildrenToRow(data, rowName, children) {
        return data.map((row) => {
            if (row.name === rowName) {
                return {
                    ...row,
                    items: children,
                    expanded: true
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

    async addPaginationInfo(recordId) {
        let countOfChildRecords = await getHierarchyRecordsCount({
            objectName: "Account",
            parentId: recordId
        });
        this.recordIdToNumberOfChildPages.set(
            recordId,
            Math.ceil(countOfChildRecords / this.recordsLimitPerBatch)
        );
        console.log("Current map: ", this.recordIdToNumberOfChildPages);
    }

    async getData(objectName, parentId) {
        let retrievedData = await getHierarchyRecords({
            objectName: objectName,
            parentId: parentId,
            recordsPerBatch: this.recordsLimitPerBatch,
            batchNumber: 0
        });
        retrievedData = retrievedData.map((item) => ({
            name: item.recordId,
            label: item.recordName,
            metatext: item.hierarchyLevel,
            items: [""],
            maximumChildPages: this.recordIdToNumberOfChildPages.get(parentId),
            currentPage: 0
        }));
        if (parentId) {
            this.items = this.addChildrenToRow(
                this.items,
                parentId,
                retrievedData
            );
        } else {
            this.items = retrievedData;
        }
        this.isTreeLoading = false;
    }
}
