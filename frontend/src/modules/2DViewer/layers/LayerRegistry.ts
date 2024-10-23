import { Layer } from "./interfaces";

export class LayerRegistry {
    private static _registeredLayers: Map<string, { new (): Layer<any, any> }> = new Map();

    /* eslint-disable-next-line @typescript-eslint/no-empty-function */
    private constructor() {}

    static registerLayer(ctor: { new (): Layer<any, any> }): void {
        this._registeredLayers.set(ctor.name, ctor);
    }

    static makeLayer(layerName: string): Layer<any, any> {
        const Layer = this._registeredLayers.get(layerName);
        if (!Layer) {
            throw new Error(`Layer ${layerName} not found`);
        }
        return new Layer();
    }
}
