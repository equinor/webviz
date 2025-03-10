import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { SettingType } from "@modules/_shared/LayerFramework/settings/settingsTypes";

export type RealizationPolygonsSettings = {
    [SettingType.ENSEMBLE]: RegularEnsembleIdent | null;
    [SettingType.REALIZATION]: number | null;
    [SettingType.POLYGONS_ATTRIBUTE]: string | null;
    [SettingType.POLYGONS_NAME]: string | null;
};
