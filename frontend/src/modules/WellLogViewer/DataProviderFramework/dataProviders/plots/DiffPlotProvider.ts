import type { WellboreLogCurveData_api } from "@api";
import type { CustomDataProviderImplementation } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";

import {
    baseLinearSettings,
    defineBaseContinuousDependencies,
    doSettingsChangesRequireDataRefetch,
    fetchData,
    verifyBasePlotSettings,
} from "./_shared";

export const differentialPlotSettings = [...baseLinearSettings] as const;
export type DiffPlotSettingTypes = typeof differentialPlotSettings;

export class DiffPlotProvider
    implements CustomDataProviderImplementation<DiffPlotSettingTypes, WellboreLogCurveData_api>
{
    doSettingsChangesRequireDataRefetch = doSettingsChangesRequireDataRefetch;
    areCurrentSettingsValid = verifyBasePlotSettings<DiffPlotSettingTypes>;
    defineDependencies = defineBaseContinuousDependencies<DiffPlotSettingTypes>;
    fetchData = fetchData<DiffPlotSettingTypes>;
    settings = differentialPlotSettings;

    getDefaultName() {
        return "Differential plot";
    }
}
