import { EnsembleIdent } from "@framework/EnsembleIdent";

import { SettingType } from "../../../settingsTypes";

export type RealizationPolygonsSettings = {
    [SettingType.ENSEMBLE]: EnsembleIdent | null;
    [SettingType.REALIZATION]: number | null;
    [SettingType.POLYGONS_ATTRIBUTE]: string | null;
    [SettingType.POLYGONS_NAME]: string | null;
};
