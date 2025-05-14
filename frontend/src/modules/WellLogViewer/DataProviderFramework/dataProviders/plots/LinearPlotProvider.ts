import type { WellboreLogCurveData_api } from "@api";
import type { CustomDataProviderImplementation } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { DefineDependenciesArgs } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import {
    baseLinearSettings,
    defineBaseContinuousDependencies,
    doSettingsChangesRequireDataRefetch,
    fetchData,
    verifyBasePlotSettings,
} from "./_shared";

export const linearPlotSettings = [Setting.PLOT_VARIANT, ...baseLinearSettings] as const;
export type LinearPlotSettingTypes = typeof linearPlotSettings;

export class LinearPlotProvider
    implements CustomDataProviderImplementation<LinearPlotSettingTypes, WellboreLogCurveData_api>
{
    doSettingsChangesRequireDataRefetch = doSettingsChangesRequireDataRefetch;
    areCurrentSettingsValid = verifyBasePlotSettings<LinearPlotSettingTypes>;
    fetchData = fetchData<LinearPlotSettingTypes>;
    settings = linearPlotSettings;

    // Uses the same external things as the other types
    defineDependencies(args: DefineDependenciesArgs<LinearPlotSettingTypes>) {
        defineBaseContinuousDependencies(args);

        args.availableSettingsUpdater(Setting.PLOT_VARIANT, () => {
            return ["line", "linestep", "dot"];
        });
    }

    getDefaultName() {
        return "Linear plot";
    }
}
