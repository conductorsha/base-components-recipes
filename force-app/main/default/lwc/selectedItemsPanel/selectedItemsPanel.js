import { LightningElement, api } from "lwc";

export default class SelectedItemsPanel extends LightningElement {
    _selectedItems;
    @api get selectedItems() {
        return this._selectedItems;
    }
    set selectedItems(value) {
        // console.log("My selected Items! : " + value);
        this._selectedItems = value;
    }

    handleRemoveOnly(event) {
        event.preventDefault();
        const { name } = event.detail;
        const customEvent = new CustomEvent("removedpill", {
            bubbles: true,
            composed: true,
            cancelable: true,
            detail: {
                name
            }
        });

        this.dispatchEvent(customEvent);
    }

    handleClick(event) {
        console.log(event.target.name);
        event.preventDefault();
        const { name } = event.target;
        const customEvent = new CustomEvent("focus", {
            bubbles: true,
            composed: true,
            cancelable: true,
            detail: {
                name
            }
        });

        this.dispatchEvent(customEvent);
    }
}
