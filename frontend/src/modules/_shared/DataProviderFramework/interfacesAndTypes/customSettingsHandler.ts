import type { QueryClient } from "@tanstack/query-core";

import type { WorkbenchSession } from "@framework/WorkbenchSession";
import type { WorkbenchSettings } from "@framework/WorkbenchSettings";

import type { Accessors, Dependency, NoUpdate, Pending, Read, ReadyComputation } from "../delegates/_utils/Dependency";
import type { Settings, SettingTypeDefinitions } from "../settings/settingsDefinitions";

import type { NullableStoredData, StoredData } from "./sharedTypes";
import type { MakeSettingTypesMap, SettingsKeysFromTuple } from "./utils";

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

type UpdateResult<T> = Awaited<T> | NoUpdate | Pending;
type MaybePromise<T> = T | Promise<T>;

export interface UpdateFunc<
    TReturnValue,
    TSettings extends Settings,
    TSettingTypes extends MakeSettingTypesMap<TSettings>,
    TKey extends SettingsKeysFromTuple<TSettings>,
> {
    (args: {
        whenReady: <TReads extends Record<string, Read<any>>>(
            readFn: (a: Accessors<TSettings, TSettingTypes, TKey>) => TReads,
        ) => ReadyComputation<TReads, TReturnValue>;
        abortSignal: AbortSignal;
    }): MaybePromise<UpdateResult<TReturnValue>>;
}

export interface DefineBasicDependenciesArgs<
    TSettings extends Settings,
    TSettingTypes extends MakeSettingTypesMap<TSettings> = MakeSettingTypesMap<TSettings>,
    TKey extends SettingsKeysFromTuple<TSettings> = SettingsKeysFromTuple<TSettings>,
> {
    settingAttributesUpdater: <TSettingKey extends TKey>(
        settingKey: TSettingKey,
        update: UpdateFunc<Partial<SettingAttributes>, TSettings, TSettingTypes, TKey>,
    ) => Dependency<Partial<SettingAttributes>, TSettings, TSettingTypes, TKey>;
    valueConstraintsUpdater: <TSettingKey extends TKey>(
        settingKey: TSettingKey,
        update: UpdateFunc<SettingTypeDefinitions[TSettingKey]["valueConstraints"], TSettings, TSettingTypes, TKey>,
    ) => Dependency<SettingTypeDefinitions[TSettingKey]["valueConstraints"], TSettings, TSettingTypes, TKey>;
    helperDependency: <T>(
        update: UpdateFunc<T, TSettings, TSettingTypes, TKey>,
    ) => Dependency<T, TSettings, TSettingTypes, TKey>;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
    queryClient: QueryClient;
}

export interface DefineDependenciesArgs<
    TSettings extends Settings,
    TStoredData extends StoredData = Record<string, never>,
    TSettingTypes extends MakeSettingTypesMap<TSettings> = MakeSettingTypesMap<TSettings>,
    TKey extends SettingsKeysFromTuple<TSettings> = SettingsKeysFromTuple<TSettings>,
    TStoredDataKey extends keyof TStoredData = keyof TStoredData,
> extends DefineBasicDependenciesArgs<TSettings, TSettingTypes, TKey> {
    storedDataUpdater: <K extends TStoredDataKey>(
        key: K,
        update: UpdateFunc<NullableStoredData<TStoredData>[K], TSettings, TSettingTypes, TKey>,
    ) => Dependency<NullableStoredData<TStoredData>[K], TSettings, TSettingTypes, TKey>;
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
     * A dependency can either be an updater for the value constraints of a setting or a stored data object, or a helper dependency (e.g. a fetching operation).
     *
     * @param args An object containing the functions for defining the different dependencies.
     */
    defineDependencies(
        args: DefineDependenciesArgs<TSettings, TStoredData, TSettingTypes, TSettingKey, TStoredDataKey>,
    ): void;
}
