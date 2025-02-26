import { SettingType, SettingTypes } from "@modules/_shared/LayerFramework/settings/settingsTypes";

export type DrilledWellborePicksSettings = SettingTypes<
    [SettingType.ENSEMBLE, SettingType.SMDA_WELLBORE_HEADERS, SettingType.SURFACE_NAME]
>;
