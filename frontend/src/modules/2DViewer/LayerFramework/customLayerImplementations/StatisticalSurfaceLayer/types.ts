import { SurfaceStatisticFunction_api } from "@api";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { SensitivityNameCasePair } from "@modules/_shared/LayerFramework/settings/implementations/SensitivitySetting";
import { SettingType } from "@modules/_shared/LayerFramework/settings/settingsTypes";

export type StatisticalSurfaceSettings = {
    [SettingType.ENSEMBLE]: RegularEnsembleIdent | null;
    [SettingType.STATISTIC_FUNCTION]: SurfaceStatisticFunction_api;
    [SettingType.SENSITIVITY]: SensitivityNameCasePair | null;
    [SettingType.SURFACE_ATTRIBUTE]: string | null;
    [SettingType.SURFACE_NAME]: string | null;
    [SettingType.TIME_OR_INTERVAL]: string | null;
};
