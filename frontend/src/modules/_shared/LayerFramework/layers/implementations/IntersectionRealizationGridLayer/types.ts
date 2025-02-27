import { SettingType } from "@modules/_shared/LayerFramework/settings/settingsTypes";

export type IntersectionRealizationGridSettings = [
    SettingType.INTERSECTION,
    SettingType.ENSEMBLE,
    SettingType.REALIZATION,
    SettingType.ATTRIBUTE,
    SettingType.GRID_NAME,
    SettingType.TIME_OR_INTERVAL,
    SettingType.SHOW_GRID_LINES
];
