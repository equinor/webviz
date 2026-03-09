import { isDevMode } from "@lib/utils/devMode";

import { GroupDelegate } from "../../delegates/GroupDelegate";
import { ItemDelegate } from "../../delegates/ItemDelegate";
import type { ItemGroup } from "../../interfacesAndTypes/entities";
import type { SerializedContextBoundary } from "../../interfacesAndTypes/serialization";
import { SerializedType } from "../../interfacesAndTypes/serialization";
import type { DataProviderManager } from "../DataProviderManager/DataProviderManager";

const CONTEXT_BOUNDARY_BRAND = Symbol("ContextBoundary");

export function isContextBoundary(obj: any): obj is ContextBoundary {
    return typeof obj === "object" && obj !== null && CONTEXT_BOUNDARY_BRAND in obj;
}

export class ContextBoundary implements ItemGroup {
    private readonly [CONTEXT_BOUNDARY_BRAND] = true;

    private _itemDelegate: ItemDelegate;
    private _groupDelegate: GroupDelegate;

    constructor(name: string, dataProviderManager: DataProviderManager) {
        this._groupDelegate = new GroupDelegate(this);
        this._groupDelegate.setColor("rgb(196 181 253)");
        this._itemDelegate = new ItemDelegate(name, 1, dataProviderManager);
    }

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    getGroupDelegate(): GroupDelegate {
        return this._groupDelegate;
    }

    serializeState(): SerializedContextBoundary {
        return {
            ...this._itemDelegate.serializeState(),
            type: SerializedType.CONTEXT_BOUNDARY,
            children: this._groupDelegate.serializeChildren(),
        };
    }

    deserializeState(serialized: SerializedContextBoundary) {
        this._itemDelegate.deserializeState(serialized);
        this._groupDelegate.deserializeChildren(serialized.children);
    }

    beforeDestroy?(): void {
        this._groupDelegate.beforeDestroy();
    }
}
