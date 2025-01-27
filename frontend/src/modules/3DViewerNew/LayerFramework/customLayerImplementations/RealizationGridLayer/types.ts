import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { SettingType } from "@modules/_shared/LayerFramework/settings/settingsTypes";

export type RealizationGridSettings = {
    [SettingType.ENSEMBLE]: RegularEnsembleIdent | null;
    [SettingType.REALIZATION]: number | null;
    [SettingType.ATTRIBUTE]: string | null;
    [SettingType.GRID_NAME]: string | null;
    [SettingType.GRID_LAYER_I_RANGE]: [number, number] | null;
    [SettingType.GRID_LAYER_J_RANGE]: [number, number] | null;
    [SettingType.GRID_LAYER_K_RANGE]: [number, number] | null;
    [SettingType.TIME_OR_INTERVAL]: string | null;
    [SettingType.SHOW_GRID_LINES]: boolean;
};
