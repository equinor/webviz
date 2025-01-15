import { WorkbenchSession } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { ColorScaleSerialization } from "@lib/utils/ColorScale";
import { QueryClient } from "@tanstack/react-query";

import { GroupDelegate } from "./delegates/GroupDelegate";
import { ItemDelegate } from "./delegates/ItemDelegate";
import { LayerDelegate } from "./delegates/LayerDelegate";
import { SettingDelegate } from "./delegates/SettingDelegate";
import { SettingsContextDelegate } from "./delegates/SettingsContextDelegate";
import { Dependency } from "./delegates/_utils/Dependency";
import { GlobalSettings } from "./framework/LayerManager/LayerManager";
import { SettingType } from "./settings/settingsTypes";

export enum SerializedType {
    LAYER_MANAGER = "layer-manager",
    VIEW = "view",
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
    layerClass: string;
    settings: SerializedSettingsState<TSettings>;
}

export interface SerializedView extends SerializedItem {
    type: SerializedType.VIEW;
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
    wrappedSettingClass: string;
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

export function instanceofItem(item: any): item is Item {
    return (item as Item).getItemDelegate !== undefined;
}

export interface Group extends Item {
    getGroupDelegate(): GroupDelegate;
}

export function instanceofGroup(item: Item): item is Group {
    return (item as Group).getItemDelegate !== undefined && (item as Group).getGroupDelegate !== undefined;
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

export interface Layer<TSettings extends Settings, TData> extends Item {
    getLayerDelegate(): LayerDelegate<TSettings, TData>;
    doSettingsChangesRequireDataRefetch(prevSettings: TSettings, newSettings: TSettings): boolean;
    fetchData(queryClient: QueryClient): Promise<TData>;
    makeBoundingBox?(): BoundingBox | null;
    makeValueRange?(): [number, number] | null;
}

export function instanceofLayer(item: Item): item is Layer<Settings, any> {
    return (
        (item as Layer<Settings, any>).getItemDelegate !== undefined &&
        (item as Layer<Settings, any>).doSettingsChangesRequireDataRefetch !== undefined &&
        (item as Layer<Settings, any>).fetchData !== undefined
    );
}

export interface GetHelperDependency<TSettings extends Settings, TKey extends keyof TSettings> {
    <TDep>(dep: Dependency<TDep, TSettings, TKey>): Awaited<TDep> | null;
}

export interface UpdateFunc<TReturnValue, TSettings extends Settings, TKey extends keyof TSettings> {
    (args: {
        getLocalSetting: <K extends TKey>(settingName: K) => TSettings[K];
        getGlobalSetting: <T extends keyof GlobalSettings>(settingName: T) => GlobalSettings[T];
        getHelperDependency: GetHelperDependency<TSettings, TKey>;
        abortSignal: AbortSignal;
    }): TReturnValue;
}

export interface DefineDependenciesArgs<TSettings extends Settings, TKey extends keyof TSettings = keyof TSettings> {
    availableSettingsUpdater: (
        settingName: TKey,
        update: UpdateFunc<EachAvailableValuesType<TSettings[TKey]>, TSettings, TKey>
    ) => Dependency<EachAvailableValuesType<TSettings[TKey]>, TSettings, TKey>;
    helperDependency: <T>(
        update: (args: {
            getLocalSetting: <T extends TKey>(settingName: T) => TSettings[T];
            getGlobalSetting: <T extends keyof GlobalSettings>(settingName: T) => GlobalSettings[T];
            getHelperDependency: <TDep>(helperDependency: Dependency<TDep, TSettings, TKey>) => TDep | null;
            abortSignal: AbortSignal;
        }) => T
    ) => Dependency<T, TSettings, TKey>;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
    queryClient: QueryClient;
}

export interface SettingsContext<TSettings extends Settings, TKey extends keyof TSettings = keyof TSettings> {
    getDelegate(): SettingsContextDelegate<TSettings, TKey>;
    areCurrentSettingsValid?: (settings: TSettings) => boolean;
    defineDependencies(args: DefineDependenciesArgs<TSettings, TKey>): void;
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
}

export type Settings = { [key in SettingType]?: any };
