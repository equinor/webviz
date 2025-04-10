import { DataProvider } from "../framework/DataProvider/DataProvider";
import type { DataProviderManager } from "../framework/DataProviderManager/DataProviderManager";
import type { CustomDataProviderImplementation } from "../interfacesAndTypes/customDataProviderImplementation";

export class DataProviderRegistry {
    private static _registeredDataProviders: Map<
        string,
        {
            customDataProviderImplementation: {
                new (customParams?: any): CustomDataProviderImplementation<any, any, any, any, any, any>;
            };
            customDataProviderImplementationConstructorParams?: any;
        }
    > = new Map();

    static registerDataProvider<
        TDataProvider extends {
            new (...params: any[]): CustomDataProviderImplementation<any, any, any, any, any, any>;
        },
    >(
        type: string,
        customDataProviderImplementation: TDataProvider,
        customDataProviderImplementationConstructorParams?: ConstructorParameters<TDataProvider>,
    ): void {
        if (this._registeredDataProviders.has(type)) {
            throw new Error(`Data provider ${type} already registered`);
        }
        this._registeredDataProviders.set(type, {
            customDataProviderImplementation,
            customDataProviderImplementationConstructorParams,
        });
    }

    static makeDataProvider(
        type: string,
        dataProviderManager: DataProviderManager,
        instanceName?: string,
    ): DataProvider<any, any, any, any> {
        const stored = this._registeredDataProviders.get(type);
        if (!stored) {
            throw new Error(`Data provider ${type} not found`);
        }
        const customDataProviderImplementation = new stored.customDataProviderImplementation(
            ...(stored.customDataProviderImplementationConstructorParams ?? []),
        );

        return new DataProvider({
            instanceName,
            dataProviderManager,
            customDataProviderImplementation,
            type,
        });
    }
}

import "./registerAllSharedDataProviders";
