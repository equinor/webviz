import type { WellboreLogCurveData_api } from "@api";
import type { CustomDataProviderImplementation } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { SetupBasicBindingsContext } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import {
    doSettingsChangesRequireDataRefetch,
    baseContinuousSettings,
    setupBaseContinuousBindings,
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

    setupBindings(ctx: SetupBasicBindingsContext<AreaPlotSettingTypes>) {
        setupBaseContinuousBindings(ctx);

        ctx.setting(Setting.PLOT_VARIANT).bindValueConstraints({
            resolve() {
                return ["area", "gradientfill"];
            },
        });
    }

    getDefaultName() {
        return "Area plot";
    }
}
