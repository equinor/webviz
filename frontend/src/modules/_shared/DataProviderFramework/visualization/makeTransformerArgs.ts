import { type DataProvider, DataProviderStatus } from "../framework/DataProvider/DataProvider";

import type { ProviderMemoStore } from "./ProviderMemoStore";
import type { TransformerArgs } from "./TransformerRegistry";

// The arguments every transformer of a provider is called with
export function makeTransformerArgs<TInjectedData extends Record<string, any>>(
    dataProvider: DataProvider<any, any, any>,
    injectedData: TInjectedData | undefined,
    memoStore: ProviderMemoStore,
): TransformerArgs<any, any, any, TInjectedData> {
    function getInjectedData() {
        if (!injectedData) {
            throw new Error("No injected data provided. Did you forget to pass it to the factory?");
        }
        return injectedData;
    }

    return {
        id: dataProvider.getItemDelegate().getId(),
        name: dataProvider.getItemDelegate().getName(),
        isLoading: dataProvider.getStatus() === DataProviderStatus.LOADING,
        getInjectedData,
        getDataValueRange: dataProvider.getDataValueRange.bind(dataProvider),
        memoize: (key, deps, compute) => memoStore.memoize(dataProvider, key, deps, compute),
        ...dataProvider.makeAccessors(),
    };
}
