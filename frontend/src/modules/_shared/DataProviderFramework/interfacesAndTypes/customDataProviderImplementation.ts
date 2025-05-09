import type { QueryClient } from "@tanstack/query-core";

import type { WorkbenchSession } from "@framework/WorkbenchSession";
import type { WorkbenchSettings } from "@framework/WorkbenchSettings";

import type { GlobalSettings } from "../framework/DataProviderManager/DataProviderManager";
import type { MakeSettingTypesMap, Settings } from "../settings/settingsDefinitions";

import type { CustomSettingsHandler } from "./customSettingsHandler";
import type { NullableStoredData, StoredData } from "./sharedTypes";
import type { AvailableValuesType, SettingsKeysFromTuple } from "./utils";

/**
 * This type is used to pass parameters to the fetchData method of a CustomDataProviderImplementation.
 * It contains accessors to the data and settings of the provider and other useful information.
 */
export type DataProviderInformationAccessors<
    TSettings extends Settings,
    TData,
    TStoredData extends StoredData = Record<string, never>,
    TSettingKey extends SettingsKeysFromTuple<TSettings> = SettingsKeysFromTuple<TSettings>,
    TSettingTypes extends MakeSettingTypesMap<TSettings> = MakeSettingTypesMap<TSettings>,
> = {
    /**
     * Access the data that the provider is currently storing.
     * @returns The data that the provider is currently storing, or null if the provider has no data.
     */
    getData: () => TData | null;

    /**
     * Access the settings of the provider.
     * @param settingName The name of the setting to access.
     * @returns The value of the setting.
     *
     * @example
     * ```typescript
     * const value = getSetting("settingName");
     * ```
     */
    getSetting: <K extends TSettingKey>(settingName: K) => TSettingTypes[K] | null;

    /**
     * Access the available values of a setting.
     * @param settingName The name of the setting to access.
     * @returns The available values of the setting.
     *
     * @example
     * ```typescript
     * const availableValues = getAvailableSettingValues("settingName");
     * ```
     */
    getAvailableSettingValues: <K extends TSettingKey>(settingName: K) => AvailableValuesType<K> | null;

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
    getGlobalSetting: <T extends keyof GlobalSettings>(settingName: T) => GlobalSettings[T];

    /**
     * Access the stored data of the provider.
     *
     * @param key The key of the stored data to access.
     * @returns The stored data, or null if the stored data does not exist.
     *
     * @example
     * ```typescript
     * const storedData = getStoredData("key");
     * ```
     */
    getStoredData: <K extends keyof TStoredData>(key: K) => TStoredData[K] | null;

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

export type AreSettingsValidArgs<
    TSettings extends Settings,
    TData,
    TStoredData extends StoredData = Record<string, never>,
    TSettingKey extends SettingsKeysFromTuple<TSettings> = SettingsKeysFromTuple<TSettings>,
    TSettingTypes extends MakeSettingTypesMap<TSettings> = MakeSettingTypesMap<TSettings>,
> = DataProviderInformationAccessors<TSettings, TData, TStoredData, TSettingKey, TSettingTypes> & {
    reportError: (error: string) => void;
};

/**
 * This type is used to pass parameters to the fetchData method of a CustomDataProviderImplementation.
 * It contains accessors to the data and settings of the provider and other useful information.
 */
export type FetchDataParams<
    TSettings extends Settings,
    TData,
    TStoredData extends StoredData = Record<string, never>,
> = {
    queryClient: QueryClient;
    registerQueryKey: (key: unknown[]) => void;
} & DataProviderInformationAccessors<TSettings, TData, TStoredData>;

export interface CustomDataProviderImplementation<
    TSettings extends Settings,
    TData,
    TStoredData extends StoredData = Record<string, never>,
    TSettingTypes extends MakeSettingTypesMap<TSettings> = MakeSettingTypesMap<TSettings>,
    TSettingKey extends SettingsKeysFromTuple<TSettings> = SettingsKeysFromTuple<TSettings>,
    TStoredDataKey extends keyof TStoredData = keyof TStoredData,
> extends CustomSettingsHandler<TSettings, TStoredData, TSettingTypes, TSettingKey, TStoredDataKey> {
    /**
     * The default name of a provider of this type.
     */
    getDefaultName(): string;

    /**
     * This optional method is called when the settings of the provider are changed. It should return true if the new settings
     * require a refetch of the data, or false if the data can be reused.
     *
     * @param prevSettings The previous settings of the provider.
     * @param newSettings The new settings of the provider.
     * @param accessors Accessors to the data and settings of the provider.
     * @returns true if the new settings require a refetch of the data, false otherwise.
     */
    doSettingsChangesRequireDataRefetch?(
        prevSettings: TSettingTypes | null,
        newSettings: TSettingTypes,
        accessors: DataProviderInformationAccessors<TSettings, TData, TStoredData>,
    ): boolean;

    /**
     * This optional method is called when the stored data of the provider is changed. It should return true if the new
     * stored data require a refetch of the data, or false if the data can be reused.
     *
     * @param prevStoredData The previous stored data of the provider.
     * @param newStoredData The new stored data of the provider.
     * @param accessors Accessors to the data and settings of the provider.
     * @returns true if the new stored data require a refetch of the data, false otherwise.
     */
    doStoredDataChangesRequireDataRefetch?(
        prevStoredData: NullableStoredData<TStoredData> | null,
        newStoredData: NullableStoredData<TStoredData>,
        accessors: DataProviderInformationAccessors<TSettings, TData, TStoredData>,
    ): boolean;

    /**
     * This method must return a promise that resolves to the data that this data provider is providing.
     * This could for example be a fetch request to a server.
     *
     * @param params An object containing accessors to the data and settings of the provider and other useful information.
     */
    fetchData(params: FetchDataParams<TSettings, TData, TStoredData>): Promise<TData>;

    /**
     * Used to determine the value range of the data in the provider. This is used for coloring the provider.
     *
     * @param accessors Accessors to the data and settings of the provider.
     */
    makeValueRange?(
        accessors: DataProviderInformationAccessors<TSettings, TData, TStoredData>,
    ): readonly [number, number] | null;

    /**
     * This method is called to check if the current settings are valid. It should return true if the settings are valid
     * and false if they are not.
     * As long as the settings are not valid, the provider will not fetch data.
     *
     * @param args Accessors to the data and settings of the provider plus a function that can be used to report an error if
     * some settings are not valid. It can be called multiple times if multiple settings are not valid.
     * @returns true if the settings are valid, false otherwise.
     */
    areCurrentSettingsValid?: (args: AreSettingsValidArgs<TSettings, TData, TStoredData>) => boolean;
}
