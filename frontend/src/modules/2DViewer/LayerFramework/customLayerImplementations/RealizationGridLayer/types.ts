import { SettingType } from "@modules/_shared/LayerFramework/settings/settingsTypes";

export type RealizationGridSettings = [
    SettingType.ENSEMBLE,
    SettingType.REALIZATION,
    SettingType.ATTRIBUTE,
    SettingType.GRID_NAME,
    SettingType.GRID_LAYER_K,
    SettingType.TIME_OR_INTERVAL,
    SettingType.SHOW_GRID_LINES
];
