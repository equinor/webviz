import { SettingType } from "@modules/_shared/LayerFramework/settings/settingsTypes";

export type ObservedSurfaceSettings = [
    SettingType.ENSEMBLE,
    SettingType.ATTRIBUTE,
    SettingType.SURFACE_NAME,
    SettingType.TIME_OR_INTERVAL
];
