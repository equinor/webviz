import type { WellboreLogCurveData_api } from "@api";
import type { CustomDataProviderImplementation } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { DefineDependenciesArgs } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import {
    doSettingsChangesRequireDataRefetch,
    baseLinearSettings,
    defineBaseContinuousDependencies,
    fetchData,
    verifyBasePlotSettings,
} from "./_shared";

export const AreaPlotSettings = [Setting.PLOT_VARIANT, ...baseLinearSettings, Setting.COLOR_SCALE] as const;
export type AreaPlotSettingTypes = typeof AreaPlotSettings;

export class AreaPlotProvider
    implements CustomDataProviderImplementation<AreaPlotSettingTypes, WellboreLogCurveData_api>
{
    doSettingsChangesRequireDataRefetch = doSettingsChangesRequireDataRefetch;
    areCurrentSettingsValid = verifyBasePlotSettings<AreaPlotSettingTypes>;
    fetchData = fetchData<AreaPlotSettingTypes>;
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
