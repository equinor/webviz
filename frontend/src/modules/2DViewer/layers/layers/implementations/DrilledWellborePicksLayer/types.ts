import { WellboreHeader_api } from "@api";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { SettingType } from "@modules/2DViewer/layers/settings/settingsTypes";

export type DrilledWellborePicksSettings = {
    [SettingType.ENSEMBLE]: RegularEnsembleIdent | null;
    [SettingType.SMDA_WELLBORE_HEADERS]: WellboreHeader_api[] | null;
    [SettingType.SURFACE_NAME]: string | null;
};
