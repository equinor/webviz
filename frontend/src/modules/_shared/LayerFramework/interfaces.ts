import React from "react";

import { WorkbenchSession } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { ColorScaleSerialization } from "@lib/utils/ColorScale";
import { QueryClient } from "@tanstack/react-query";

import { GroupDelegate } from "./delegates/GroupDelegate";
import { ItemDelegate } from "./delegates/ItemDelegate";
import { SharedSettingsDelegate } from "./delegates/SharedSettingsDelegate";
import { Dependency } from "./delegates/_utils/Dependency";
import { GlobalSettings } from "./framework/DataLayerManager/DataLayerManager";
import {
    MakeSettingTypesMap,
    Setting,
    SettingCategories,
    SettingCategory,
    SettingTypes,
} from "./settings/settingsDefinitions";

// ----------------------------
// The following interfaces/types are used to define the structure of the serialized state of the respective items in the data layer framework.

export enum SerializedType {
    LAYER_MANAGER = "layer-manager",
    GROUP = "group",
    LAYER = "layer",
    SETTINGS_GROUP = "settings-group",
    COLOR_SCALE = "color-scale",
    DELTA_SURFACE = "delta-surface",
    SHARED_SETTING = "shared-setting",
}

export interface SerializedItem {
    id: string;
    type: SerializedType;
    name: string;
    expanded: boolean;
    visible: boolean;
}

export type SerializedSettingsState<
    TSettings extends Settings,
    TSettingKey extends SettingsKeysFromTuple<TSettings> = SettingsKeysFromTuple<TSettings>
> = {
    [K in TSettingKey]: string;
};

export interface SerializedLayer<
    TSettings extends Settings,
    TSettingKey extends SettingsKeysFromTuple<TSettings> = SettingsKeysFromTuple<TSettings>
> extends SerializedItem {
    type: SerializedType.LAYER;
    layerType: string;
    settings: SerializedSettingsState<TSettings, TSettingKey>;
}

export interface SerializedGroup extends SerializedItem {
    type: SerializedType.GROUP;
    groupType: string;
    color: string;
    children: SerializedItem[];
}

export interface SerializedSettingsGroup extends SerializedItem {
    type: SerializedType.SETTINGS_GROUP;
    children: SerializedItem[];
}

export interface SerializedColorScale extends SerializedItem {
    type: SerializedType.COLOR_SCALE;
    colorScale: ColorScaleSerialization;
    userDefinedBoundaries: boolean;
}

export interface SerializedSharedSetting extends SerializedItem {
    type: SerializedType.SHARED_SETTING;
    wrappedSettingType: Setting;
    value: string;
}

export interface SerializedLayerManager extends SerializedItem {
    type: SerializedType.LAYER_MANAGER;
    children: SerializedItem[];
}

export interface SerializedDeltaSurface extends SerializedItem {
    type: SerializedType.DELTA_SURFACE;
    children: SerializedItem[];
}

// ----------------------------

/**
 * Each entity in the data layer framework is based upon the Item interface.
 * It provides methods for serializing and deserializing the state of the entity.
 * It also provides a delegate that can be used to interact with the item - e.g. changing its name, visibility, etc.
 */
export interface Item {
    getItemDelegate(): ItemDelegate;
    serializeState(): SerializedItem;
    deserializeState(serialized: SerializedItem): void;
}

export function instanceofItem(item: any): item is Item {
    return (item as Item).getItemDelegate !== undefined;
}

/**
 * A group is a special type of item that can contain other items.
 */
export interface ItemGroup extends Item {
    getGroupDelegate(): GroupDelegate;
}

export function instanceofItemGroup(group: any): group is ItemGroup {
    return (group as ItemGroup).getGroupDelegate !== undefined;
}

export interface SharedSettingsProvider {
    getSharedSettingsDelegate(): SharedSettingsDelegate<any>;
}

export function instanceofSharedSettingsProvider(item: Item): item is SharedSettingsProvider & Item {
    return (item as any).getSharedSettingsDelegate !== undefined;
}

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

/**
 * An enum that defines the different types of coloring that a layer can use for visualization.
 */
export enum LayerColoringType {
    NONE = "NONE",
    COLORSCALE = "COLORSCALE",
    COLORSET = "COLORSET",
}

export function includesCustomSettingsHandler(
    obj: any
): obj is CustomSettingsHandler<Settings, StoredData, MakeSettingTypesMap<Settings>> {
    return obj.settings !== undefined && obj.defineDependencies !== undefined;
}

export function includesSettings(obj: any): obj is CustomGroupImplementationWithSettings {
    return obj.settings !== undefined && obj.getDefaultSettingsValues !== undefined;
}

/**
 * This interface is describing what methods and members a custom group must implement.
 * A custom group can contain settings but it does not have to.
 */
export interface CustomGroupImplementation {
    /**
     * @returns The default name of a group of this type.
     */
    getDefaultName(): string;
}

export interface CustomGroupImplementationWithSettings<
    TSettings extends Settings = [],
    TSettingTypes extends MakeSettingTypesMap<TSettings> = MakeSettingTypesMap<TSettings>
> extends CustomGroupImplementation {
    /**
     * The settings that this handler is using/providing.
     */
    settings: TSettings;

    /**
     * A method that returns the default values of the settings.
     * @returns The default values of the settings.
     */
    getDefaultSettingsValues(): TSettingTypes;
}

/**
 * This interface is describing what methods and members a custom settings handler must implement.
 * This can either be used by a data layer or by a group.
 */
export interface CustomSettingsHandler<
    TSettings extends Settings,
    TStoredData extends StoredData = Record<string, never>,
    TSettingTypes extends MakeSettingTypesMap<TSettings> = MakeSettingTypesMap<TSettings>,
    TSettingKey extends SettingsKeysFromTuple<TSettings> = SettingsKeysFromTuple<TSettings>,
    TStoredDataKey extends keyof TStoredData = keyof TStoredData
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
     * A method that defines the dependencies of the settings of the layer.
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
        args: DefineDependenciesArgs<TSettings, TStoredData, TSettingTypes, TSettingKey, TStoredDataKey>
    ): void;
}
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
     * The type of coloring that this layer uses for visualization.
     */
    getColoringType(): LayerColoringType;

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

export interface GetHelperDependency<
    TSettings extends Settings,
    TSettingTypes extends MakeSettingTypesMap<TSettings>,
    TKey extends SettingsKeysFromTuple<TSettings>
> {
    <TDep>(dep: Dependency<TDep, TSettings, TSettingTypes, TKey>): Awaited<TDep> | null;
}

export type TupleIndices<T extends readonly any[]> = Extract<keyof T, `${number}`>;
export type SettingsKeysFromTuple<TSettings extends Settings> = TSettings[TupleIndices<TSettings>];
export interface UpdateFunc<
    TReturnValue,
    TSettings extends Settings,
    TSettingTypes extends MakeSettingTypesMap<TSettings>,
    TKey extends SettingsKeysFromTuple<TSettings>
> {
    (args: {
        getLocalSetting: <K extends TKey>(settingName: K) => TSettingTypes[K];
        getGlobalSetting: <T extends keyof GlobalSettings>(settingName: T) => GlobalSettings[T];
        getHelperDependency: GetHelperDependency<TSettings, TSettingTypes, TKey>;
        abortSignal: AbortSignal;
    }): TReturnValue;
}

export interface DefineDependenciesArgs<
    TSettings extends Settings,
    TStoredData extends StoredData = Record<string, never>,
    TSettingTypes extends MakeSettingTypesMap<TSettings> = MakeSettingTypesMap<TSettings>,
    TKey extends SettingsKeysFromTuple<TSettings> = SettingsKeysFromTuple<TSettings>,
    TStoredDataKey extends keyof TStoredData = keyof TStoredData
> {
    availableSettingsUpdater: <TSettingKey extends TKey>(
        settingKey: TSettingKey,
        update: UpdateFunc<AvailableValuesType<TSettingKey>, TSettings, TSettingTypes, TKey>
    ) => Dependency<AvailableValuesType<TSettingKey>, TSettings, TSettingTypes, TKey>;
    storedDataUpdater: <K extends TStoredDataKey>(
        key: K,
        update: UpdateFunc<NullableStoredData<TStoredData>[TStoredDataKey], TSettings, TSettingTypes, TKey>
    ) => Dependency<NullableStoredData<TStoredData>[TStoredDataKey], TSettings, TSettingTypes, TKey>;
    helperDependency: <T>(
        update: (args: {
            getLocalSetting: <T extends TKey>(settingName: T) => TSettingTypes[T];
            getGlobalSetting: <T extends keyof GlobalSettings>(settingName: T) => GlobalSettings[T];
            getHelperDependency: <TDep>(
                helperDependency: Dependency<TDep, TSettings, TSettingTypes, TKey>
            ) => TDep | null;
            abortSignal: AbortSignal;
        }) => T
    ) => Dependency<T, TSettings, TSettingTypes, TKey>;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
    queryClient: QueryClient;
}

// Required when making "AvailableValuesType" for all settings in an object ("TSettings")
export type EachAvailableValuesType<TSetting> = TSetting extends Setting ? AvailableValuesType<TSetting> : never;

// Returns an array of "TValue" if the "TValue" itself is not already an array
export type AvailableValuesType<TSetting extends Setting> = MakeAvailableValuesTypeBasedOnCategory<
    SettingTypes[TSetting],
    SettingCategories[TSetting]
>;

// "MakeArrayIfNotArray<T>" yields "unknown[] | any[]" for "T = any"  - we don't want "unknown[]"
type RemoveUnknownFromArray<T> = T extends (infer U)[] ? ([unknown] extends [U] ? any[] : T) : T;
type MakeArrayIfNotArray<T> = Exclude<T, null> extends Array<infer V> ? Array<V> : Array<Exclude<T, null>>;

export type MakeAvailableValuesTypeBasedOnCategory<TValue, TCategory extends SettingCategory> = TCategory extends
    | SettingCategory.SINGLE_OPTION
    | SettingCategory.MULTI_OPTION
    ? RemoveUnknownFromArray<MakeArrayIfNotArray<TValue>>
    : TCategory extends SettingCategory.NUMBER
    ? [Exclude<TValue, null>, Exclude<TValue, null>]
    : TCategory extends SettingCategory.NUMBER_WITH_STEP
    ? [Exclude<TValue, null>, Exclude<TValue, null>, Exclude<TValue, null>]
    : TCategory extends SettingCategory.RANGE
    ? Exclude<TValue, null>
    : never;

export type SettingComponentProps<TValue, TCategory extends SettingCategory> = {
    onValueChange: (newValue: TValue) => void;
    value: TValue;
    isValueValid: boolean;
    overriddenValue: TValue | null;
    isOverridden: boolean;
    availableValues: MakeAvailableValuesTypeBasedOnCategory<TValue, TCategory> | null;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
    globalSettings: GlobalSettings;
};

export type ValueToStringArgs<TValue> = {
    value: TValue;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
};

export interface CustomSettingImplementation<TValue, TCategory extends SettingCategory> {
    defaultValue?: TValue;
    getIsStatic?: () => boolean;
    makeComponent(): (props: SettingComponentProps<TValue, TCategory>) => React.ReactNode;
    fixupValue?: (
        currentValue: TValue,
        availableValues: MakeAvailableValuesTypeBasedOnCategory<TValue, TCategory>
    ) => TValue;
    isValueValid?: (
        value: TValue,
        availableValues: MakeAvailableValuesTypeBasedOnCategory<TValue, TCategory>
    ) => boolean;
    serializeValue?: (value: TValue) => string;
    deserializeValue?: (serializedValue: string) => TValue;
    overriddenValueRepresentation?: (args: OverriddenValueRepresentationArgs<TValue>) => React.ReactNode;
}

export type OverriddenValueRepresentationArgs<TValue> = {
    value: TValue;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
};

export type Settings = ReadonlyArray<Setting> & { __brand?: "MyType" };

export type StoredData = Record<string, any>;
export type NullableStoredData<TStoredData extends StoredData> = {
    [key in keyof TStoredData]: TStoredData[key] | null;
};
