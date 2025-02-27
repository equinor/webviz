import { WorkbenchSession } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { ColorScaleSerialization } from "@lib/utils/ColorScale";
import { QueryClient } from "@tanstack/react-query";

import { GroupDelegate } from "./delegates/GroupDelegate";
import { ItemDelegate } from "./delegates/ItemDelegate";
import { SettingDelegate } from "./delegates/SettingDelegate";
import { Dependency } from "./delegates/_utils/Dependency";
import { GlobalSettings } from "./framework/DataLayerManager/DataLayerManager";
import { AllSettingTypes, MakeSettingTypesMap, SettingType } from "./settings/settingsTypes";

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

export type SerializedSettingsState<TSettings> = Record<keyof TSettings, string>;

export interface SerializedLayer<TSettings> extends SerializedItem {
    type: SerializedType.LAYER;
    layerName: string;
    settings: SerializedSettingsState<TSettings>;
}

export interface SerializedGroup extends SerializedItem {
    type: SerializedType.GROUP;
    groupName: string;
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
    settingType: SettingType;
    wrappedSettingClass: SettingType;
    wrappedSettingCtorParams: any[];
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

export interface Item {
    getItemDelegate(): ItemDelegate;
    serializeState(): SerializedItem;
    deserializeState(serialized: SerializedItem): void;
}

export interface ItemGroup {
    getGroupDelegate(): GroupDelegate;
}

export function instanceofItem(item: any): item is Item {
    return (item as Item).getItemDelegate !== undefined;
}

export type BoundingBox = {
    x: [number, number];
    y: [number, number];
    z: [number, number];
};

export enum FetchDataFunctionResult {
    SUCCESS = "SUCCESS",
    IN_PROGRESS = "IN_PROGRESS",
    ERROR = "ERROR",
    NO_CHANGE = "NO_CHANGE",
}
export interface FetchDataFunction<TSettings extends Settings, TKey extends keyof TSettings> {
    (
        oldValues: { [K in TKey]?: TSettings[K] },
        newValues: { [K in TKey]?: TSettings[K] }
    ): Promise<FetchDataFunctionResult>;
}

export type DataLayerInformationAccessors<
    TSettings extends Partial<AllSettingTypes>,
    TData,
    TStoredData extends StoredData = Record<string, unknown>
> = {
    getData: () => TData | null;
    getSetting: <K extends keyof TSettings>(settingName: K) => TSettings[K];
    getAvailableSettingValues: <K extends keyof TSettings>(settingName: K) => AvailableValuesType<TSettings[K]>;
    getGlobalSetting: <T extends keyof GlobalSettings>(settingName: T) => GlobalSettings[T];
    getStoredData: <K extends keyof TStoredData>(key: K) => TStoredData[K] | null;
};

export type FetchDataParams<
    TSettings extends Partial<AllSettingTypes>,
    TStoredData extends StoredData = Record<string, unknown>
> = {
    queryClient: QueryClient;
    registerQueryKey: (key: unknown[]) => void;
} & Omit<DataLayerInformationAccessors<TSettings, TStoredData>, "getData">;

export enum LayerColoringType {
    NONE = "NONE",
    COLORSCALE = "COLORSCALE",
    COLORSET = "COLORSET",
}

export interface CustomSettingsHandler<
    TSettingTypes extends Settings,
    TStoredData extends StoredData = Record<string, never>,
    TSettings extends Partial<AllSettingTypes> = MakeSettingTypesMap<TSettingTypes>,
    TSettingKey extends keyof TSettings = keyof TSettings,
    TStoredDataKey extends keyof TStoredData = keyof TStoredData
> {
    settings: TSettingTypes;
    getDefaultName(): string;
    defineDependencies(
        args: DefineDependenciesArgs<TSettingTypes, TSettings, TStoredData, TSettingKey, TStoredDataKey>
    ): void;
    areCurrentSettingsValid?: (settings: TSettings) => boolean;
}
export interface CustomGroupImplementation<
    TSettingTypes extends Settings,
    TStoredData extends StoredData = Record<string, never>,
    TSettings extends Partial<AllSettingTypes> = MakeSettingTypesMap<TSettingTypes>,
    TSettingKey extends keyof TSettings = keyof TSettings,
    TStoredDataKey extends keyof TStoredData = keyof TStoredData
> extends CustomSettingsHandler<TSettingTypes, TStoredData, TSettings, TSettingKey, TStoredDataKey> {}

export interface CustomDataLayerImplementation<
    TSettingTypes extends Settings,
    TData,
    TStoredData extends StoredData = Record<string, never>,
    TSettings extends Partial<AllSettingTypes> = MakeSettingTypesMap<TSettingTypes>,
    TSettingKey extends keyof TSettings = keyof TSettings,
    TStoredDataKey extends keyof TStoredData = keyof TStoredData
> extends CustomSettingsHandler<TSettingTypes, TStoredData, TSettings, TSettingKey, TStoredDataKey> {
    getColoringType(): LayerColoringType;
    doSettingsChangesRequireDataRefetch(
        prevSettings: TSettings,
        newSettings: TSettings,
        accessors: DataLayerInformationAccessors<TSettings, TData, TStoredData>
    ): boolean;
    fetchData(params: FetchDataParams<TSettings, TStoredData>): Promise<TData>;
    makeBoundingBox?(accessors: DataLayerInformationAccessors<TSettings, TData, TStoredData>): BoundingBox | null;
    predictBoundingBox?(accessors: DataLayerInformationAccessors<TSettings, TData, TStoredData>): BoundingBox | null;
    makeValueRange?(accessors: DataLayerInformationAccessors<TSettings, TData, TStoredData>): [number, number] | null;
}

export interface GetHelperDependency<
    TSettingTypes extends Settings,
    TSettings extends Partial<AllSettingTypes>,
    TKey extends keyof TSettings
> {
    <TDep>(dep: Dependency<TDep, TSettingTypes, TSettings, TKey>): Awaited<TDep> | null;
}

export interface UpdateFunc<
    TReturnValue,
    TSettingTypes extends Settings,
    TSettings extends Partial<AllSettingTypes>,
    TKey extends keyof TSettings
> {
    (args: {
        getLocalSetting: <K extends TKey>(settingName: K) => TSettings[K];
        getGlobalSetting: <T extends keyof GlobalSettings>(settingName: T) => GlobalSettings[T];
        getHelperDependency: GetHelperDependency<TSettingTypes, TSettings, TKey>;
        abortSignal: AbortSignal;
    }): TReturnValue;
}

export interface DefineDependenciesArgs<
    TSettingTypes extends Settings,
    TSettings extends Partial<AllSettingTypes>,
    TStoredData extends StoredData = Record<string, never>,
    TKey extends keyof TSettings = keyof TSettings,
    TStoredDataKey extends keyof TStoredData = keyof TStoredData
> {
    availableSettingsUpdater: (
        settingKey: TKey,
        update: UpdateFunc<EachAvailableValuesType<TSettings[TKey]>, TSettingTypes, TSettings, TKey>
    ) => Dependency<EachAvailableValuesType<TSettings[TKey]>, TSettingTypes, TSettings, TKey>;
    storedDataUpdater: (
        key: TStoredDataKey,
        update: UpdateFunc<NullableStoredData<TStoredData>[TStoredDataKey], TSettingTypes, TSettings, TKey>
    ) => Dependency<NullableStoredData<TStoredData>[TStoredDataKey], TSettingTypes, TSettings, TKey>;
    helperDependency: <T>(
        update: (args: {
            getLocalSetting: <T extends TKey>(settingName: T) => TSettings[T];
            getGlobalSetting: <T extends keyof GlobalSettings>(settingName: T) => GlobalSettings[T];
            getHelperDependency: <TDep>(
                helperDependency: Dependency<TDep, TSettingTypes, TSettings, TKey>
            ) => TDep | null;
            abortSignal: AbortSignal;
        }) => T
    ) => Dependency<T, TSettingTypes, TSettings, TKey>;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
    queryClient: QueryClient;
}

// Required when making "AvailableValuesType" for all settings in an object ("TSettings")
export type EachAvailableValuesType<T> = T extends any ? AvailableValuesType<T> : never;

// Returns an array of "TValue" if the "TValue" itself is not already an array
export type AvailableValuesType<TValue> = RemoveUnknownFromArray<MakeArrayIfNotArray<TValue>>;

// "MakeArrayIfNotArray<T>" yields "unknown[] | any[]" for "T = any"  - we don't want "unknown[]"
type RemoveUnknownFromArray<T> = T extends unknown[] | any[] ? any[] : T;
type MakeArrayIfNotArray<T> = Exclude<T, null> extends Array<infer V> ? Array<V> : Array<Exclude<T, null>>;

export type SettingComponentProps<TValue> = {
    onValueChange: (newValue: TValue) => void;
    value: TValue;
    isValueValid: boolean;
    overriddenValue: TValue | null;
    isOverridden: boolean;
    availableValues: AvailableValuesType<TValue>;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
    globalSettings: GlobalSettings;
};

export type ValueToStringArgs<TValue> = {
    value: TValue;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
};

export interface Setting<TValue> {
    getType(): SettingType;
    getLabel(): string;
    makeComponent(): (props: SettingComponentProps<TValue>) => React.ReactNode;
    getDelegate(): SettingDelegate<TValue>;
    fixupValue?: (availableValues: AvailableValuesType<TValue>, currentValue: TValue) => TValue;
    isValueValid?: (availableValues: AvailableValuesType<TValue>, value: TValue) => boolean;
    serializeValue?: (value: TValue) => string;
    deserializeValue?: (serializedValue: string) => TValue;
    valueToString?: (args: ValueToStringArgs<TValue>) => string;
    getConstructorParams?: () => any[];
}

export type Settings = SettingType[] & { readonly __settings?: never };

export type StoredData = Record<string, any>;
export type NullableStoredData<TStoredData extends StoredData> = {
    [key in keyof TStoredData]: TStoredData[key] | null;
};
