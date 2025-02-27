import { DataLayer } from "../framework/DataLayer/DataLayer";
import { DataLayerManager } from "../framework/DataLayerManager/DataLayerManager";
import { CustomDataLayerImplementation } from "../interfaces";

export class LayerRegistry {
    private static _registeredLayers: Map<
        string,
        {
            customDataLayerImplementation: {
                new (customParams?: any): CustomDataLayerImplementation<any, any, any, any>;
            };
            customDataLayerImplementationParams?: any;
        }
    > = new Map();

    static registerLayer<
        TDataLayer extends { new (...params: any[]): CustomDataLayerImplementation<any, any, any, any> }
    >(
        name: string,
        customDataLayerImplementation: TDataLayer,
        customDataLayerImplementationParams?: ConstructorParameters<TDataLayer>
    ): void {
        if (this._registeredLayers.has(name)) {
            throw new Error(`Layer ${name} already registered`);
        }
        this._registeredLayers.set(name, {
            customDataLayerImplementation,
            customDataLayerImplementationParams,
        });
    }

    static makeLayer(
        layerName: string,
        layerManager: DataLayerManager,
        instanceName?: string
    ): DataLayer<any, any, any, any> {
        const stored = this._registeredLayers.get(layerName);
        if (!stored) {
            throw new Error(`Layer ${layerName} not found`);
        }
        const customDataLayerImplementation = new stored.customDataLayerImplementation(
            ...(stored.customDataLayerImplementationParams ?? [])
        );

        return new DataLayer({
            instanceName,
            layerManager,
            customDataLayerImplementation,
            layerName,
        });
    }
}
