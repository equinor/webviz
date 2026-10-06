import type { DataProvider } from "../framework/DataProvider/DataProvider";

/*
 * The values that the transformers of each provider memoize (see TransformerArgs.memoize).
 * Keyed by the DataProvider instance itself (not its ID string) so that entries for destroyed data providers are
 * reclaimed by ordinary GC once nothing else references the provider, instead of living as long as the assembler
 * (which is a long-lived, module-scope singleton).
 */
export class ProviderMemoStore {
    private _memoizedValuesMap: WeakMap<
        DataProvider<any, any, any>,
        Map<string, { deps: readonly unknown[]; value: unknown }>
    > = new WeakMap();

    memoize<T>(dataProvider: DataProvider<any, any, any>, key: string, deps: readonly unknown[], compute: () => T): T {
        let memoizedValues = this._memoizedValuesMap.get(dataProvider);
        if (!memoizedValues) {
            memoizedValues = new Map();
            this._memoizedValuesMap.set(dataProvider, memoizedValues);
        }

        const memoized = memoizedValues.get(key);
        if (
            memoized &&
            memoized.deps.length === deps.length &&
            memoized.deps.every((dep, index) => Object.is(dep, deps[index]))
        ) {
            return memoized.value as T;
        }

        const value = compute();
        // Copied, so that changing the array passed in afterwards can't change what is compared against
        memoizedValues.set(key, { deps: [...deps], value });
        return value;
    }
}
