import type { DefaultError, FetchQueryOptions, QueryKey } from "@tanstack/query-core";

import type { Settings } from "../settings/settingsDefinitions";

import type { CustomDataProviderImplementation } from "./customDataProviderImplementation";
import type { NullableStoredData } from "./sharedTypes";
import type { MakeSettingTypesMap, SettingsKeysFromTuple } from "./utils";

export enum Operation {
    DELTA = "DELTA",
}

type DataProviderImplementation = {
    new (...params: any[]): CustomDataProviderImplementation<any, any, any>;
};

/**
 * Utility type to extract the Settings type parameter from a CustomDataProviderImplementation class.
 */
export type ExtractSettings<T> = T extends new (
    ...args: any[]
) => CustomDataProviderImplementation<infer TSettings, any, any>
    ? TSettings
    : never;

/**
 * Utility type to extract the StoredData type parameter from a CustomDataProviderImplementation class.
 */
export type ExtractStoredData<T> = T extends new (
    ...args: any[]
) => CustomDataProviderImplementation<any, any, infer TStoredData>
    ? TStoredData
    : never;

/**
 * Creates a discriminated union of child settings objects from supported implementations.
 * Each entry in the union corresponds to one of the supported data provider implementations.
 * The `providerImplementation` field acts as a discriminant for type narrowing.
 *
 * @example
 * ```typescript
 * for (const child of params.childrenSettings) {
 *     if (child.providerImplementation === DepthSurfaceProvider) {
 *         // child.settings and child.storedData are now typed for DepthSurfaceProvider
 *     }
 * }
 * ```
 */
export type ChildSettingsUnion<TImplementations extends DataProviderImplementation[]> = {
    [K in keyof TImplementations]: TImplementations[K] extends DataProviderImplementation
        ? {
              providerImplementation: TImplementations[K];
              settings: MakeSettingTypesMap<ExtractSettings<TImplementations[K]>>;
              storedData: NullableStoredData<ExtractStoredData<TImplementations[K]>>;
          }
        : never;
}[number];

export type FetchParams<TSupportedDataProviderImplementations extends DataProviderImplementation[]> = {
    /**
     * Array of settings from each child provider in the group.
     * Order matches the order of children in the group.
     * Type is a discriminated union of all supported data provider implementations.
     */
    childrenSettings: Array<ChildSettingsUnion<TSupportedDataProviderImplementations>>;

    /**
     * Fetch data using Tanstack Query client.
     */
    fetchQuery: <
        TQueryFnData = unknown,
        TError = DefaultError,
        TData = TQueryFnData,
        TQueryKey extends QueryKey = QueryKey,
    >(
        options: FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
    ) => Promise<TData>;

    /**
     * Called when fetch is cancelled or finished.
     */
    onFetchCancelOrFinish: (callback: () => void) => void;
};

export interface CustomOperationGroupImplementation<
    TSettings extends Settings,
    TData,
    TSupportedDataProviderImplementations extends DataProviderImplementation[],
    TSettingTypes extends MakeSettingTypesMap<TSettings> = MakeSettingTypesMap<TSettings>,
    TSettingKey extends SettingsKeysFromTuple<TSettings> = SettingsKeysFromTuple<TSettings>,
> {
    supportedDataProviderImplementations: TSupportedDataProviderImplementations;

    getName(): string;

    fetchData(params: FetchParams<TSupportedDataProviderImplementations>): Promise<TData>;
}
