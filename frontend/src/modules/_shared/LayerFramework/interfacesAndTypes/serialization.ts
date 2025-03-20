import { ColorScaleSerialization } from "@lib/utils/ColorScale";

import { SettingsKeysFromTuple } from "./utils";

import { Setting, Settings } from "../settings/settingsDefinitions";

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
