import { ItemDelegate } from "../../delegates/ItemDelegate";
import { Item } from "../../interfacesAndTypes/entities";
import { SerializedPlaceholder, SerializedItem } from "../../interfacesAndTypes/serialization";
import { DataProviderManager } from "../DataProviderManager/DataProviderManager";

const ERROR_PLACEHOLDER_BRAND = Symbol("ErrorPlaceholder");

export function isErrorPlaceholder(obj: any): obj is ErrorPlaceholder {
    return typeof obj === "object" && obj !== null && ERROR_PLACEHOLDER_BRAND in obj;
}

export class ErrorPlaceholder implements Item {
    private readonly [ERROR_PLACEHOLDER_BRAND] = true;

    private _itemDelegate: ItemDelegate;

    private _originalSerializedItem: SerializedPlaceholder;
    private _errorMessage: string;

    constructor(
        name: string,
        errorMessage: string,
        originalSerializedItem: SerializedPlaceholder,
        dataProviderManager: DataProviderManager,
    ) {
        this._itemDelegate = new ItemDelegate(name, 0, dataProviderManager);
        this._errorMessage = errorMessage;
        this._originalSerializedItem = originalSerializedItem;
    }

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    getErrorMessage(): string {
        return this._errorMessage;
    }

    serializeState(): SerializedPlaceholder {
        return this._originalSerializedItem;
    }

    deserializeState(_: SerializedItem): void {
        // No need to implement this, as an ErrorPlaceholder is only used when deserialization has already failed. We can just keep the original serialized item as the state of the ErrorPlaceholder.
    }
}
