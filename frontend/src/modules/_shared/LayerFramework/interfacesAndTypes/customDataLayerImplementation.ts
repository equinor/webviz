import type { WorkbenchSession } from "@framework/WorkbenchSession";
import type { WorkbenchSettings } from "@framework/WorkbenchSettings";
import type { QueryClient } from "@tanstack/query-core";

import type { CustomSettingsHandler } from "./customSettingsHandler";
import type { StoredData } from "./sharedTypes";
import type { AvailableValuesType, SettingsKeysFromTuple } from "./utils";

import type { GlobalSettings } from "../framework/DataLayerManager/DataLayerManager";
import type { MakeSettingTypesMap, Settings } from "../settings/settingsDefinitions";

/**
 * This type is used to pass parameters to the fetchData method of a CustomDataLayerImplementation.
 * It contains accessors to the data and settings of the layer and other useful information.
 */
export type DataLayerInformationAccessors<
    TSettings extends Settings,
    TData,
    TStoredData extends StoredData = Record<string, unknown>,
    TSettingKey extends SettingsKeysFromTuple<TSettings> = SettingsKeysFromTuple<TSettings>,
    TSettingTypes extends MakeSettingTypesMap<TSettings> = MakeSettingTypesMap<TSettings>
> = {
    /**
     * Access the data that the layer is currently storing.
     * @returns The data that the layer is currently storing, or null if the layer has no data.
     */
    getData: () => TData | null;

    /**
     * Access the settings of the layer.
     * @param settingName The name of the setting to access.
     * @returns The value of the setting.
     *
     * @example
     * ```typescript
     * const value = getSetting("settingName");
     * ```
     */
    getSetting: <K extends TSettingKey>(settingName: K) => TSettingTypes[K];

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
     * Access the global settings of the data layer manager.
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
     * Access the stored data of the layer.
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

/**
 * This type is used to pass parameters to the fetchData method of a CustomDataLayerImplementation.
 * It contains accessors to the data and settings of the layer and other useful information.
 */
export type FetchDataParams<
    TSettings extends Settings,
    TData,
    TStoredData extends StoredData = Record<string, unknown>
> = {
    queryClient: QueryClient;
    registerQueryKey: (key: unknown[]) => void;
} & DataLayerInformationAccessors<TSettings, TData, TStoredData>;

export interface CustomDataLayerImplementation<
    TSettings extends Settings,
    TData,
    TStoredData extends StoredData = Record<string, never>,
    TSettingTypes extends MakeSettingTypesMap<TSettings> = MakeSettingTypesMap<TSettings>,
    TSettingKey extends SettingsKeysFromTuple<TSettings> = SettingsKeysFromTuple<TSettings>,
    TStoredDataKey extends keyof TStoredData = keyof TStoredData
> extends CustomSettingsHandler<TSettings, TStoredData, TSettingTypes, TSettingKey, TStoredDataKey> {
    /**
     * The default name of a layer of this type.
     */
    getDefaultName(): string;

    /**
     * This method is called when the settings of the layer are changed. It should return true if the new settings
     * require a refetch of the data, or false if the data can be reused.
     *
     * @param prevSettings The previous settings of the layer.
     * @param newSettings The new settings of the layer.
     * @param accessors Accessors to the data and settings of the layer.
     */
    doSettingsChangesRequireDataRefetch(
        prevSettings: TSettingTypes | null,
        newSettings: TSettingTypes,
        accessors: DataLayerInformationAccessors<TSettings, TData, TStoredData>
    ): boolean;

    /**
     * This method must return a promise that resolves to the data that this data layer is providing.
     * This could for example be a fetch request to a server.
     *
     * @param params An object containing accessors to the data and settings of the layer and other useful information.
     */
    fetchData(params: FetchDataParams<TSettings, TData, TStoredData>): Promise<TData>;

    /**
     * Used to determine the value range of the data in the layer. This is used for coloring the layer.
     *
     * @param accessors Accessors to the data and settings of the layer.
     */
    makeValueRange?(accessors: DataLayerInformationAccessors<TSettings, TData, TStoredData>): [number, number] | null;

    /**
     * This method is called to check if the current settings are valid. It should return true if the settings are valid
     * and false if they are not.
     * As long as the settings are not valid, the layer will not fetch data.
     *
     * @param accessors Accessors to the data and settings of the layer.
     * @returns
     */
    areCurrentSettingsValid?: (accessors: DataLayerInformationAccessors<TSettings, TData, TStoredData>) => boolean;
}
