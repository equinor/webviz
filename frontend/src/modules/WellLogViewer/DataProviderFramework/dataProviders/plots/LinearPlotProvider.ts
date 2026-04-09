import type { WellboreLogCurveData_api } from "@api";
import type { CustomDataProviderImplementation } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { SetupBasicBindingsContext } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import {
    baseContinuousSettings,
    setupBaseContinuousBindings,
    doSettingsChangesRequireDataRefetch,
    fetchLogCurveData,
    verifyBasePlotSettings,
} from "./_shared";

export const linearPlotSettings = [Setting.PLOT_VARIANT, ...baseContinuousSettings] as const;
export type LinearPlotSettingTypes = typeof linearPlotSettings;

export class LinearPlotProvider
    implements CustomDataProviderImplementation<LinearPlotSettingTypes, WellboreLogCurveData_api>
{
    doSettingsChangesRequireDataRefetch = doSettingsChangesRequireDataRefetch;
    areCurrentSettingsValid = verifyBasePlotSettings<LinearPlotSettingTypes>;
    fetchData = fetchLogCurveData<LinearPlotSettingTypes>;
    settings = linearPlotSettings;

    setupBindings(ctx: SetupBasicBindingsContext<LinearPlotSettingTypes>) {
        setupBaseContinuousBindings(ctx);

        ctx.setting(Setting.PLOT_VARIANT).bindValueConstraints({
            resolve() {
                return ["line", "linestep", "dot"];
            },
        });
    }

    getDefaultName() {
        return "Linear plot";
    }
}
