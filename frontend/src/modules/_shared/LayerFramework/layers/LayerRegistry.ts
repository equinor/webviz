import type { LayerManager } from "../framework/LayerManager/LayerManager";
import type { Layer } from "../interfaces";

export class LayerRegistry {
    private static _registeredLayers: Map<string, { new (layerManager: LayerManager): Layer<any, any, any> }> =
        new Map();

    static registerLayer(ctor: { new (layerManager: LayerManager): Layer<any, any, any> }): void {
        this._registeredLayers.set(ctor.name, ctor);
    }

    static makeLayer(layerName: string, layerManager: LayerManager): Layer<any, any, any> {
        const Layer = this._registeredLayers.get(layerName);
        if (!Layer) {
            throw new Error(`Layer ${layerName} not found`);
        }
        return new Layer(layerManager);
    }
}
