import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { SettingType } from "@modules/_shared/LayerFramework/settings/settingsTypes";

export type RealizationGridSettings = {
    [SettingType.ENSEMBLE]: RegularEnsembleIdent | null;
    [SettingType.REALIZATION]: number | null;
    [SettingType.ATTRIBUTE]: string | null;
    [SettingType.GRID_NAME]: string | null;
    [SettingType.GRID_LAYER_K]: number | null;
    [SettingType.TIME_OR_INTERVAL]: string | null;
    [SettingType.SHOW_GRID_LINES]: boolean;
};
