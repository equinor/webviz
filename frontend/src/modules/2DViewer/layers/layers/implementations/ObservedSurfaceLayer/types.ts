import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { SettingType } from "@modules/2DViewer/layers/settings/settingsTypes";

export type ObservedSurfaceSettings = {
    [SettingType.ENSEMBLE]: RegularEnsembleIdent | null;
    [SettingType.SURFACE_ATTRIBUTE]: string | null;
    [SettingType.SURFACE_NAME]: string | null;
    [SettingType.TIME_OR_INTERVAL]: string | null;
};
