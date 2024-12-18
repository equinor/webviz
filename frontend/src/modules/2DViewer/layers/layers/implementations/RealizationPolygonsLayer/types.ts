import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

import { SettingType } from "../../../settings/settingsTypes";

export type RealizationPolygonsSettings = {
    [SettingType.ENSEMBLE]: RegularEnsembleIdent | null;
    [SettingType.REALIZATION]: number | null;
    [SettingType.POLYGONS_ATTRIBUTE]: string | null;
    [SettingType.POLYGONS_NAME]: string | null;
};
