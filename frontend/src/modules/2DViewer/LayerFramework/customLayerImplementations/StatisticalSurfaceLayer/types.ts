import type { SurfaceStatisticFunction_api } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { SensitivityNameCasePair } from "@modules/_shared/LayerFramework/settings/implementations/SensitivitySetting";
import type { SettingType } from "@modules/_shared/LayerFramework/settings/settingsTypes";

export type StatisticalSurfaceSettings = {
    [SettingType.ENSEMBLE]: RegularEnsembleIdent | null;
    [SettingType.STATISTIC_FUNCTION]: SurfaceStatisticFunction_api;
    [SettingType.SENSITIVITY]: SensitivityNameCasePair | null;
    [SettingType.ATTRIBUTE]: string | null;
    [SettingType.SURFACE_NAME]: string | null;
    [SettingType.TIME_OR_INTERVAL]: string | null;
};
