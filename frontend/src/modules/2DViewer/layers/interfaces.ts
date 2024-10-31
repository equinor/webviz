import { WorkbenchSession } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { QueryClient } from "@tanstack/react-query";

import { GlobalSettings } from "./LayerManager";
import { GroupDelegate } from "./delegates/GroupDelegate";
import { ItemDelegate } from "./delegates/ItemDelegate";
import { LayerDelegate } from "./delegates/LayerDelegate";
import { SettingDelegate } from "./delegates/SettingDelegate";
import { SettingsContextDelegate } from "./delegates/SettingsContextDelegate";
import { SettingType } from "./settingsTypes";

export interface Item {
    getItemDelegate(): ItemDelegate;
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

export enum LayerStatus {
    IDLE = "IDLE",
    LOADING = "LOADING",
    ERROR = "ERROR",
    SUCCESS = "SUCCESS",
    INVALID_SETTINGS = "INVALID_SETTINGS",
}

export type BoundingBox = {
    x: [number, number];
    y: [number, number];
    z: [number, number];
};

export interface FetchDataFunction<TSettings extends Settings, TKey extends keyof TSettings> {
    (oldValues: { [K in TKey]: TSettings[K] }, newValues: { [K in TKey]: TSettings[K] }): Promise<boolean>;
}

export interface Layer<TSettings extends Settings, TData> extends Item {
    getLayerDelegate(): LayerDelegate<TSettings, TData>;
    doSettingsChangesRequireDataRefetch(prevSettings: TSettings, newSettings: TSettings): boolean;
    fechData(queryClient: QueryClient): Promise<TData>;
    makeBoundingBox?(): BoundingBox | null;
    makeValueRange?(): [number, number] | null;
}

export function instanceofLayer(item: Item): item is Layer<Settings, any> {
    return (
        (item as Layer<Settings, any>).getItemDelegate !== undefined &&
        (item as Layer<Settings, any>).doSettingsChangesRequireDataRefetch !== undefined &&
        (item as Layer<Settings, any>).fechData !== undefined
    );
}

export interface SettingsContext<TSettings extends Settings, TKey extends keyof TSettings = keyof TSettings> {
    getDelegate(): SettingsContextDelegate<TSettings, TKey>;
    fetchData: FetchDataFunction<TSettings, TKey>;
    areCurrentSettingsValid(): boolean;
}

export type AvailableValuesType<TValue> = TValue extends Array<unknown> ? TValue : Array<TValue>;

export type SettingComponentProps<TValue> = {
    onValueChange: (newValue: TValue) => void;
    value: TValue;
    isValueValid: boolean;
    overriddenValue: TValue | null;
    isOverridden: boolean;
    availableValues: AvailableValuesType<Exclude<TValue, null>>;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
    globalSettings: GlobalSettings;
};

export interface Setting<TValue> {
    getType(): SettingType;
    getLabel(): string;
    makeComponent(): (props: SettingComponentProps<TValue>) => React.ReactNode;
    getDelegate(): SettingDelegate<TValue>;
    fixupValue?: (availableValues: AvailableValuesType<TValue>, currentValue: TValue) => TValue;
    isValueValid?: (availableValues: AvailableValuesType<TValue>, value: TValue) => boolean;
}

export enum SettingTopic {
    VALUE_CHANGED = "VALUE_CHANGED",
    VALIDITY_CHANGED = "VALIDITY_CHANGED",
    AVAILABLE_VALUES_CHANGED = "AVAILABLE_VALUES_CHANGED",
    OVERRIDDEN_CHANGED = "OVERRIDDEN_CHANGED",
    LOADING_STATE_CHANGED = "LOADING_STATE_CHANGED",
}

export type SettingTopicPayloads<TValue> = {
    [SettingTopic.VALUE_CHANGED]: TValue;
    [SettingTopic.VALIDITY_CHANGED]: boolean;
    [SettingTopic.AVAILABLE_VALUES_CHANGED]: Exclude<TValue, null>[];
    [SettingTopic.OVERRIDDEN_CHANGED]: TValue | undefined;
    [SettingTopic.LOADING_STATE_CHANGED]: boolean;
};

export type Settings = { [key in SettingType]?: unknown };
