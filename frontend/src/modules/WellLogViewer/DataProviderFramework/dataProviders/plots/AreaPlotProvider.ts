import type { WellboreLogCurveData_api } from "@api";
import type { CustomDataProviderImplementation } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { DefineDependenciesArgs } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import {
    doSettingsChangesRequireDataRefetch,
    baseContinuousSettings,
    defineBaseContinuousDependencies,
    fetchLogCurveData,
    verifyBasePlotSettings,
} from "./_shared";

export const AreaPlotSettings = [Setting.PLOT_VARIANT, ...baseContinuousSettings, Setting.COLOR_SCALE] as const;
export type AreaPlotSettingTypes = typeof AreaPlotSettings;

export class AreaPlotProvider
    implements CustomDataProviderImplementation<AreaPlotSettingTypes, WellboreLogCurveData_api>
{
    doSettingsChangesRequireDataRefetch = doSettingsChangesRequireDataRefetch;
    areCurrentSettingsValid = verifyBasePlotSettings<AreaPlotSettingTypes>;
    fetchData = fetchLogCurveData<AreaPlotSettingTypes>;
    settings = AreaPlotSettings;

    defineDependencies(args: DefineDependenciesArgs<AreaPlotSettingTypes>) {
        defineBaseContinuousDependencies(args);

        args.availableSettingsUpdater(Setting.PLOT_VARIANT, () => {
            return ["area", "gradientfill"];
        });
    }

    getDefaultName() {
        return "Area plot";
    }
}
