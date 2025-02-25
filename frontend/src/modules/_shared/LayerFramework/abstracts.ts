import { QueryClient } from "@tanstack/query-core";

import { ItemDelegate } from "./delegates/ItemDelegate";
import { LayerColoringType, LayerDelegate } from "./delegates/LayerDelegate";
import { LayerManager } from "./framework/LayerManager/LayerManager";
import { Layer, SerializedLayer, Settings, SettingsContext, StoredData } from "./interfaces";

export abstract class LayerAbstractImpl<
    TSettings extends Settings,
    TData,
    TStoredData extends StoredData = Record<string, never>
> implements Layer<TSettings, TData, TStoredData>
{
    private _layerDelegate: LayerDelegate<TSettings, TData, TStoredData>;
    private _itemDelegate: ItemDelegate;

    constructor(
        layerManager: LayerManager,
        name: string,
        settingsContext: SettingsContext<TSettings, TStoredData>,
        coloringType: LayerColoringType
    ) {
        this._itemDelegate = new ItemDelegate(name, layerManager);
        this._layerDelegate = new LayerDelegate(this, layerManager, settingsContext, coloringType);
    }

    getSettingsContext() {
        return this._layerDelegate.getSettingsContext();
    }

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    getLayerDelegate(): LayerDelegate<TSettings, TData, TStoredData> {
        return this._layerDelegate;
    }

    serializeState(): SerializedLayer<TSettings> {
        return this._layerDelegate.serializeState();
    }
    deserializeState(serializedState: SerializedLayer<TSettings>): void {
        this._layerDelegate.deserializeState(serializedState);
    }

    abstract doSettingsChangesRequireDataRefetch(prevSettings: TSettings, newSettings: TSettings): boolean;
    abstract fetchData(queryClient: QueryClient): Promise<TData>;

    // Optional methods from inter
    // makeBoundingBox?(): BoundingBox | null;
    // predictBoundingBox?(): BoundingBox | null;
    // makeValueRange?(): [number, number] | null;
}
