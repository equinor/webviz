import type { WellboreLogCurveData_api } from "@api";
import type {
    CustomDataProviderImplementation,
    DataProviderInformationAccessors,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { DefineDependenciesArgs } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import {
    doSettingsChangesRequireDataRefetch,
    baseContinuousSettings,
    defineBaseContinuousDependencies,
    fetchLogCurveData,
    verifyBasePlotSettings,
    type WellLogPlotProviderMeta,
    type WellLogPlotProviderSnapshot,
} from "./_shared";

export const AreaPlotSettings = [Setting.PLOT_VARIANT, ...baseContinuousSettings, Setting.COLOR_SCALE] as const;
export type AreaPlotSettingTypes = typeof AreaPlotSettings;

export class AreaPlotProvider
    implements
        CustomDataProviderImplementation<
            AreaPlotSettingTypes,
            WellboreLogCurveData_api,
            Record<string, never>,
            WellLogPlotProviderMeta
        >
{
    doSettingsChangesRequireDataRefetch = doSettingsChangesRequireDataRefetch;
    areCurrentSettingsValid = verifyBasePlotSettings<AreaPlotSettingTypes>;
    fetchData = fetchLogCurveData<AreaPlotSettingTypes>;
    settings = AreaPlotSettings;

    makeProviderSnapshot(
        args: DataProviderInformationAccessors<AreaPlotSettingTypes, WellboreLogCurveData_api>,
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
                colorScale: args.getSetting(Setting.COLOR_SCALE),
            },
        };
    }

    defineDependencies(args: DefineDependenciesArgs<AreaPlotSettingTypes>) {
        defineBaseContinuousDependencies(args);

        args.valueConstraintsUpdater(Setting.PLOT_VARIANT, () => {
            return ["area", "gradientfill"];
        });
    }

    getDefaultName() {
        return "Area plot";
    }
}
