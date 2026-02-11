import type { WellboreLogCurveData_api } from "@api";
import type {
    CustomDataProviderImplementation,
    DataProviderInformationAccessors,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
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

export const differentialPlotSettings = [...baseContinuousSettings] as const;
export type DiffPlotSettingTypes = typeof differentialPlotSettings;

export class DiffPlotProvider
    implements
        CustomDataProviderImplementation<
            DiffPlotSettingTypes,
            WellboreLogCurveData_api,
            Record<string, never>,
            WellLogPlotProviderMeta
        >
{
    doSettingsChangesRequireDataRefetch = doSettingsChangesRequireDataRefetch;
    areCurrentSettingsValid = verifyBasePlotSettings<DiffPlotSettingTypes>;
    defineDependencies = defineBaseContinuousDependencies<DiffPlotSettingTypes>;
    fetchData = fetchLogCurveData<DiffPlotSettingTypes>;
    settings = differentialPlotSettings;

    makeProviderSnapshot(
        args: DataProviderInformationAccessors<DiffPlotSettingTypes, WellboreLogCurveData_api>,
    ): WellLogPlotProviderSnapshot {
        return {
            data: args.getData(),
            valueRange: null,
            dataLabel: args.getSetting(Setting.LOG_CURVE)?.curveName ?? null,
            meta: {
                color: args.getSetting(Setting.COLOR),
                plotVariant: null,
                showLabels: null,
                showLines: null,
                labelRotation: null,
                colorScale: null,
            },
        };
    }

    getDefaultName() {
        return "Differential plot";
    }
}
