import { EnsembleIdent } from "@framework/EnsembleIdent";
import { SettingType } from "@modules/2DViewer/layers/settingsTypes";

export type ObservedSurfaceSettings = {
    [SettingType.ENSEMBLE]: EnsembleIdent | null;
    [SettingType.SURFACE_ATTRIBUTE]: string | null;
    [SettingType.SURFACE_NAME]: string | null;
    [SettingType.TIME_OR_INTERVAL]: string | null;
};
