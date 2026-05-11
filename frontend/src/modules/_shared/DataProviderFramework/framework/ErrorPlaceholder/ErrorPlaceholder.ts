import { ItemDelegate } from "../../delegates/ItemDelegate";
import type { Item } from "../../interfacesAndTypes/entities";
import type { SerializedPlaceholder, SerializedItem } from "../../interfacesAndTypes/serialization";
import type { DataProviderManager } from "../DataProviderManager/DataProviderManager";

// Using a unique brand to identify ErrorPlaceholder objects, since instanceof checks won't work due to potential multiple versions of the module.
// Using Symbol.for to ensure that even if there are multiple versions of the module, they will all reference the same symbol for the brand.
const ERROR_PLACEHOLDER_BRAND = Symbol.for("dpf/error-placeholder");

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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    deserializeState(_: SerializedItem): void {
        // No need to implement this, as an ErrorPlaceholder is only used when deserialization has already failed. We can just keep the original serialized item as the state of the ErrorPlaceholder.
    }
}
