import type { WellboreLogCurveData_api } from "@api";
import type { CustomDataProviderImplementation } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";

import {
    baseContinuousSettings,
    setupBaseContinuousBindings,
    doSettingsChangesRequireDataRefetch,
    fetchLogCurveData,
    verifyBasePlotSettings,
} from "./_shared";

export const differentialPlotSettings = [...baseContinuousSettings] as const;
export type DiffPlotSettingTypes = typeof differentialPlotSettings;

export class DiffPlotProvider
    implements CustomDataProviderImplementation<DiffPlotSettingTypes, WellboreLogCurveData_api>
{
    doSettingsChangesRequireDataRefetch = doSettingsChangesRequireDataRefetch;
    areCurrentSettingsValid = verifyBasePlotSettings<DiffPlotSettingTypes>;
    setupBindings = setupBaseContinuousBindings<DiffPlotSettingTypes>;
    fetchData = fetchLogCurveData<DiffPlotSettingTypes>;
    settings = differentialPlotSettings;

    getDefaultName() {
        return "Differential plot";
    }
}
