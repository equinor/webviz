import { DataLayer } from "../framework/DataLayer/DataLayer";
import type { DataLayerManager } from "../framework/DataLayerManager/DataLayerManager";
import type { CustomDataLayerImplementation } from "../interfacesAndTypes/customDataLayerImplementation";

export class LayerRegistry {
    private static _registeredLayers: Map<
        string,
        {
            customDataLayerImplementation: {
                new (customParams?: any): CustomDataLayerImplementation<any, any, any, any, any, any>;
            };
            customDataLayerImplementationConstructorParams?: any;
        }
    > = new Map();

    static registerLayer<
        TDataLayer extends { new (...params: any[]): CustomDataLayerImplementation<any, any, any, any, any, any> },
    >(
        type: string,
        customDataLayerImplementation: TDataLayer,
        customDataLayerImplementationConstructorParams?: ConstructorParameters<TDataLayer>,
    ): void {
        if (this._registeredLayers.has(type)) {
            throw new Error(`Layer ${type} already registered`);
        }
        this._registeredLayers.set(type, {
            customDataLayerImplementation,
            customDataLayerImplementationConstructorParams,
        });
    }

    static makeLayer(
        type: string,
        layerManager: DataLayerManager,
        instanceName?: string,
    ): DataLayer<any, any, any, any> {
        const stored = this._registeredLayers.get(type);
        if (!stored) {
            throw new Error(`Layer ${type} not found`);
        }
        const customDataLayerImplementation = new stored.customDataLayerImplementation(
            ...(stored.customDataLayerImplementationConstructorParams ?? []),
        );

        return new DataLayer({
            instanceName,
            layerManager,
            customDataLayerImplementation,
            type,
        });
    }
}
