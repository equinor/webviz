import { EnsembleIdent } from "@framework/EnsembleIdent";

import { SettingType } from "../../../settingsTypes";

export type RealizationSurfaceSettings = {
    [SettingType.ENSEMBLE]: EnsembleIdent | null;
    [SettingType.REALIZATION]: number | null;
    [SettingType.SURFACE_ATTRIBUTE]: string | null;
    [SettingType.SURFACE_NAME]: string | null;
    [SettingType.TIME_OR_INTERVAL]: string | null;
};
