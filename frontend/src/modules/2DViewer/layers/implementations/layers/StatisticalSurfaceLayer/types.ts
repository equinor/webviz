import { SurfaceStatisticFunction_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { SettingType } from "@modules/2DViewer/layers/settingsTypes";

import { SensitivityNameCasePair } from "../../settings/Sensitivity";

export type StatisticalSurfaceSettings = {
    [SettingType.ENSEMBLE]: EnsembleIdent | null;
    [SettingType.STATISTIC_FUNCTION]: SurfaceStatisticFunction_api;
    [SettingType.SENSITIVITY]: SensitivityNameCasePair | null;
    [SettingType.SURFACE_ATTRIBUTE]: string | null;
    [SettingType.SURFACE_NAME]: string | null;
    [SettingType.TIME_OR_INTERVAL]: string | null;
};
