import type { WellboreLogCurveData_api } from "@api";
import type {
    CustomDataProviderImplementation,
    DataProviderInformationAccessors,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { DefineDependenciesArgs } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import {
    baseContinuousSettings,
    defineBaseContinuousDependencies,
    doSettingsChangesRequireDataRefetch,
    fetchLogCurveData,
    verifyBasePlotSettings,
    type WellLogPlotProviderMeta,
    type WellLogPlotProviderSnapshot,
} from "./_shared";

export const linearPlotSettings = [Setting.PLOT_VARIANT, ...baseContinuousSettings] as const;
export type LinearPlotSettingTypes = typeof linearPlotSettings;

export class LinearPlotProvider
    implements
        CustomDataProviderImplementation<
            LinearPlotSettingTypes,
            WellboreLogCurveData_api,
            Record<string, never>,
            WellLogPlotProviderMeta
        >
{
    doSettingsChangesRequireDataRefetch = doSettingsChangesRequireDataRefetch;
    areCurrentSettingsValid = verifyBasePlotSettings<LinearPlotSettingTypes>;
    fetchData = fetchLogCurveData<LinearPlotSettingTypes>;
    settings = linearPlotSettings;

    makeProviderSnapshot(
        args: DataProviderInformationAccessors<LinearPlotSettingTypes, WellboreLogCurveData_api>,
    ): WellLogPlotProviderSnapshot {
        return {
            data: args.getData(),
            valueRange: null,
            dataLabel: args.getSetting(Setting.LOG_CURVE)?.curveName ?? null,
            meta: {
                color: args.getSetting(Setting.COLOR),
                plotVariant: args.getSetting(Setting.PLOT_VARIANT),
                showLabels: null,
                showLines: null,
                labelRotation: null,
                colorScale: null,
            },
        };
    }

    // Uses the same external things as the other types
    defineDependencies(args: DefineDependenciesArgs<LinearPlotSettingTypes>) {
        defineBaseContinuousDependencies(args);

        args.valueConstraintsUpdater(Setting.PLOT_VARIANT, () => {
            return ["line", "linestep", "dot"];
        });
    }

    getDefaultName() {
        return "Linear plot";
    }
}
