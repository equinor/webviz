import { EnsembleIdent } from "@framework/EnsembleIdent";
import { SettingType } from "@modules/2DViewer/layers/settingsTypes";

export type RealizationGridSettings = {
    [SettingType.ENSEMBLE]: EnsembleIdent | null;
    [SettingType.REALIZATION]: number | null;
    [SettingType.GRID_ATTRIBUTE]: string | null;
    [SettingType.GRID_NAME]: string | null;
    [SettingType.GRID_LAYER]: number | null;
    [SettingType.TIME_OR_INTERVAL]: string | null;
};
