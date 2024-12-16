import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

import { SettingType } from "../../../settings/settingsTypes";

export type RealizationSurfaceSettings = {
    [SettingType.ENSEMBLE]: RegularEnsembleIdent | null;
    [SettingType.REALIZATION]: number | null;
    [SettingType.SURFACE_ATTRIBUTE]: string | null;
    [SettingType.SURFACE_NAME]: string | null;
    [SettingType.TIME_OR_INTERVAL]: string | null;
};
