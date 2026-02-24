import type { DefaultError, FetchQueryOptions, QueryKey } from "@tanstack/query-core";

import type { WorkbenchSession } from "@framework/WorkbenchSession";
import type { WorkbenchSettings } from "@framework/WorkbenchSettings";

import type { GlobalSettings } from "../framework/DataProviderManager/DataProviderManager";
import type { SettingTypeDefinitions } from "../settings/settingsDefinitions";

import type {
    CustomDataProviderImplementation,
    DataProviderMeta,
    ProviderSnapshot,
} from "./customDataProviderImplementation";
import type { NullableStoredData } from "./sharedTypes";
import type { MakeSettingTypesMap, SettingsKeysFromTuple } from "./utils";

export enum Operation {
    DELTA = "DELTA",
}

export type DataProviderImplementation = {
    new (...params: any[]): CustomDataProviderImplementation<any, any, any, any>;
};

/**
 * Utility type to extract the Settings type parameter from a CustomDataProviderImplementation class.
 */
export type ExtractSettings<T> = T extends new (
    ...args: any[]
) => CustomDataProviderImplementation<infer TSettings, any, any, any>
    ? TSettings
    : never;

/**
 * Utility type to extract the StoredData type parameter from a CustomDataProviderImplementation class.
 */
export type ExtractStoredData<T> = T extends new (
    ...args: any[]
) => CustomDataProviderImplementation<any, any, infer TStoredData, any>
    ? TStoredData
    : never;

/**
 * Utility type to extract all Setting keys from a DataProviderImplementation.
 * Distributes over unions, so it collects keys from all implementations in a tuple.
 */
export type ExtractSettingKeys<T> = T extends DataProviderImplementation
    ? SettingsKeysFromTuple<ExtractSettings<T>>
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

export type OperationGroupInformationAccessors<
    TData,
    TSupportedDataProviderImplementations extends DataProviderImplementation[],
> = {
    /**
     * Access the elevated/shared settings of the operation group.
     * @returns A partial record of setting values elevated from child providers.
     */
    getSharedSettings: () => Partial<{
        [K in ExtractSettingKeys<
            TSupportedDataProviderImplementations[number]
        >]: SettingTypeDefinitions[K]["externalValue"];
    }>;

    /**
     * Access the data that the group is currently storing.
     * @returns The data that the provider is currently storing, or null if the provider has no data.
     */
    getData: () => TData | null;

    /**
     * Array of settings from each child provider in the group.
     * Order matches the order of children in the group.
     * Type is a discriminated union of all supported data provider implementations.
     */
    childrenSettings: Array<ChildSettingsUnion<TSupportedDataProviderImplementations>>;

    /**
     * Access the global settings of the data provider manager.
     *
     * @param settingName The name of the global setting to access.
     * @returns The value of the global setting.
     *
     * @example
     * ```typescript
     * const value = getGlobalSetting("settingName");
     * ```
     */
    getGlobalSetting: <T extends keyof GlobalSettings>(settingName: T) => GlobalSettings[T] | null;

    /**
     * Access to the workbench session.
     * @returns The workbench session.
     */
    getWorkbenchSession: () => WorkbenchSession;

    /**
     * Access to the workbench settings.
     * @returns The workbench settings.
     */
    getWorkbenchSettings: () => WorkbenchSettings;
};

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

    /**
     * Set progress message for the operation group.
     */
    setProgressMessage: (message: string | null) => void;
};

export interface CustomOperationGroupImplementation<
    TData,
    TMeta extends DataProviderMeta,
    TSupportedDataProviderImplementations extends DataProviderImplementation[],
> {
    supportedDataProviderImplementations: TSupportedDataProviderImplementations;

    minChildrenCount?: number;
    maxChildrenCount?: number;

    getName(): string;

    makeReadableOperationString(elems: string[]): string;

    fetchData(params: FetchParams<TSupportedDataProviderImplementations>): Promise<TData>;

    /**
     * Produce a minimal snapshot for downstream consumers (e.g. visualization).
     * Must NOT expose settings/storedData directly unless intentionally included in meta.
     */
    makeProviderSnapshot: (
        accessors: OperationGroupInformationAccessors<TData, TSupportedDataProviderImplementations>,
    ) => ProviderSnapshot<TData, TMeta>;
}
