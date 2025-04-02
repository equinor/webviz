import { DataProvider } from "../framework/DataProvider/DataProvider";
import type { DataProviderManager } from "../framework/DataProviderManager/DataProviderManager";
import type { CustomDataProviderImplementation } from "../interfacesAndTypes/customDataProviderImplementation";

export class LayerRegistry {
    private static _registeredLayers: Map<
        string,
        {
            customDataProviderImplementation: {
                new (customParams?: any): CustomDataProviderImplementation<any, any, any, any, any, any>;
            };
            customDataProviderImplementationConstructorParams?: any;
        }
    > = new Map();

    static registerLayer<
        TDataProvider extends {
            new (...params: any[]): CustomDataProviderImplementation<any, any, any, any, any, any>;
        },
    >(
        type: string,
        customDataProviderImplementation: TDataProvider,
        customDataProviderImplementationConstructorParams?: ConstructorParameters<TDataProvider>,
    ): void {
        if (this._registeredLayers.has(type)) {
            throw new Error(`Layer ${type} already registered`);
        }
        this._registeredLayers.set(type, {
            customDataProviderImplementation,
            customDataProviderImplementationConstructorParams,
        });
    }

    static makeLayer(
        type: string,
        layerManager: DataProviderManager,
        instanceName?: string,
    ): DataProvider<any, any, any, any> {
        const stored = this._registeredLayers.get(type);
        if (!stored) {
            throw new Error(`Layer ${type} not found`);
        }
        const customDataProviderImplementation = new stored.customDataProviderImplementation(
            ...(stored.customDataProviderImplementationConstructorParams ?? []),
        );

        return new DataProvider({
            instanceName,
            layerManager,
            customDataProviderImplementation,
            type,
        });
    }
}
