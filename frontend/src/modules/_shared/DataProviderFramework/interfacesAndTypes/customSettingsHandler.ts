import type { WorkbenchSession } from "@framework/WorkbenchSession";
import type { WorkbenchSettings } from "@framework/WorkbenchSettings";
import type { QueryClient } from "@tanstack/query-core";

import type { NullableStoredData, StoredData } from "./sharedTypes";
import type { AvailableValuesType, SettingsKeysFromTuple } from "./utils";

import type { Dependency } from "../delegates/_utils/Dependency";
import type { GlobalSettings } from "../framework/DataProviderManager/DataProviderManager";
import type { MakeSettingTypesMap, Settings } from "../settings/settingsDefinitions";

export interface GetHelperDependency<
    TSettings extends Settings,
    TSettingTypes extends MakeSettingTypesMap<TSettings>,
    TKey extends SettingsKeysFromTuple<TSettings>,
> {
    <TDep>(dep: Dependency<TDep, TSettings, TSettingTypes, TKey>): Awaited<TDep> | null;
}

export type SettingAttributes = {
    visible: boolean;
    enabled: boolean;
};

export const CancelUpdate = Symbol("CancelUpdate");

export interface UpdateFunc<
    TReturnValue,
    TSettings extends Settings,
    TSettingTypes extends MakeSettingTypesMap<TSettings>,
    TKey extends SettingsKeysFromTuple<TSettings>,
> {
    (args: {
        getLocalSetting: <K extends TKey>(settingName: K) => TSettingTypes[K];
        getGlobalSetting: <T extends keyof GlobalSettings>(settingName: T) => GlobalSettings[T];
        getHelperDependency: GetHelperDependency<TSettings, TSettingTypes, TKey>;
        abortSignal: AbortSignal;
    }): TReturnValue | typeof CancelUpdate;
}

export interface DefineDependenciesArgs<
    TSettings extends Settings,
    TStoredData extends StoredData = Record<string, never>,
    TSettingTypes extends MakeSettingTypesMap<TSettings> = MakeSettingTypesMap<TSettings>,
    TKey extends SettingsKeysFromTuple<TSettings> = SettingsKeysFromTuple<TSettings>,
    TStoredDataKey extends keyof TStoredData = keyof TStoredData,
> {
    availableSettingsUpdater: <TSettingKey extends TKey>(
        settingKey: TSettingKey,
        update: UpdateFunc<AvailableValuesType<TSettingKey>, TSettings, TSettingTypes, TKey>,
    ) => Dependency<AvailableValuesType<TSettingKey>, TSettings, TSettingTypes, TKey>;
    storedDataUpdater: <K extends TStoredDataKey>(
        key: K,
        update: UpdateFunc<NullableStoredData<TStoredData>[TStoredDataKey], TSettings, TSettingTypes, TKey>,
    ) => Dependency<NullableStoredData<TStoredData>[TStoredDataKey], TSettings, TSettingTypes, TKey>;
    settingAttributesUpdater: <TSettingKey extends TKey>(
        settingKey: TSettingKey,
        update: UpdateFunc<Partial<SettingAttributes>, TSettings, TSettingTypes, TKey>,
    ) => Dependency<Partial<SettingAttributes>, TSettings, TSettingTypes, TKey>;
    helperDependency: <T>(
        update: (args: {
            getLocalSetting: <T extends TKey>(settingName: T) => TSettingTypes[T];
            getGlobalSetting: <T extends keyof GlobalSettings>(settingName: T) => GlobalSettings[T];
            getHelperDependency: <TDep>(
                helperDependency: Dependency<TDep, TSettings, TSettingTypes, TKey>,
            ) => TDep | null;
            abortSignal: AbortSignal;
        }) => T,
    ) => Dependency<T, TSettings, TSettingTypes, TKey>;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
    queryClient: QueryClient;
}

/**
 * This interface is describing what methods and members a custom settings handler must implement.
 * This can either be used by a data provider or by a group.
 */
export interface CustomSettingsHandler<
    TSettings extends Settings,
    TStoredData extends StoredData = Record<string, never>,
    TSettingTypes extends MakeSettingTypesMap<TSettings> = MakeSettingTypesMap<TSettings>,
    TSettingKey extends SettingsKeysFromTuple<TSettings> = SettingsKeysFromTuple<TSettings>,
    TStoredDataKey extends keyof TStoredData = keyof TStoredData,
> {
    /**
     * The settings that this handler is using/providing.
     */
    settings: TSettings;

    /**
     * A method that returns the default values of the settings.
     * @returns The default values of the settings.
     */
    getDefaultSettingsValues?(): Partial<TSettingTypes>;

    /**
     * A method that defines the dependencies of the settings of the data provider.
     * A dependency can either be an updater for the available values of a setting or a stored data object, or a helper dependency (e.g. a fetching operation).
     *
     * @param args An object containing the functions for defining the different dependencies.
     *
     * @example
     * ```typescript
     * defineDependencies({
     *    availableSettingsUpdater,
     *    storedDataUpdater,
     *    helperDependency,
     *    queryClient
     * }: DefineDependenciesArgs<TSettings, SettingsWithTypes>) {
     *   availableSettingsUpdater(SettingType.REALIZATION, ({ getGlobalSetting, getLocalSetting, getHelperDependency }) => {
     *       // Get global settings
     *       const fieldIdentifier = getGlobalSetting("fieldId");
     *
     *       // Or local settings
     *       const ensembles = getLocalSetting(SettingType.ENSEMBLE);
     *
     *       // Or a helper dependency - note: defined within the same defineDependencies call
     *       const data = getHelperDependency(dataDependency);
     *
     *       // Do something with the settings and data
     *       ...
     *
     *       // Return the available values for the setting
     *       return availableValues;
     *     });
     *
     *     // The same can be done with stored data
     *     storedDataUpdater("key", ({ getGlobalSetting, getLocalSetting, getHelperDependency }) => {
     *         ...
     *     });
     *
     *     // A helper dependency can be defined like this
     *     const dataDependency = helperDependency(async ({ getLocalSetting, getGlobalSetting, abortSignal }) => {
     *         // Get local or global settings
     *         ...
     *
     *         // Use them to fetch data
     *         const data = await queryClient.fetchQuery({
     *             ...
     *             // Use the abort signal to cancel the request if needed - this is automatically handled by the framework
     *             signal: abortSignal,
     *         });
     *     });
     * }
     *
     */
    defineDependencies(
        args: DefineDependenciesArgs<TSettings, TStoredData, TSettingTypes, TSettingKey, TStoredDataKey>,
    ): void;
}
