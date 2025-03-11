import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { SettingType } from "@modules/_shared/LayerFramework/settings/settingsTypes";

export type ObservedSurfaceSettings = {
    [SettingType.ENSEMBLE]: RegularEnsembleIdent | null;
    [SettingType.ATTRIBUTE]: string | null;
    [SettingType.SURFACE_NAME]: string | null;
    [SettingType.TIME_OR_INTERVAL]: string | null;
};
