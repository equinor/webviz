import type { WellboreLogCurveData_api, WellboreLogCurveHeader_api } from "@api";
import { WellLogCurveSourceEnum_api, WellLogCurveTypeEnum_api, getWellboreLogCurveHeadersOptions } from "@api";
import type {
    CustomDataProviderImplementation,
    DataProviderInformationAccessors,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { DefineDependenciesArgs } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/utils";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import {
    baseDiscreteSettings,
    doSettingsChangesRequireDataRefetch,
    fetchLogCurveData,
    verifyBasePlotSettings,
    type WellLogPlotProviderMeta,
    type WellLogPlotProviderSnapshot,
} from "./_shared";

export const stackedPlotSettings = [...baseDiscreteSettings, Setting.LABEL_ROTATION] as const;
export type StackedPlotSettingTypes = typeof stackedPlotSettings;
type SettingsTypeMap = MakeSettingTypesMap<StackedPlotSettingTypes>;

export class StackedPlotProvider
    implements
        CustomDataProviderImplementation<
            StackedPlotSettingTypes,
            WellboreLogCurveData_api,
            Record<string, never>,
            WellLogPlotProviderMeta
        >
{
    doSettingsChangesRequireDataRefetch = doSettingsChangesRequireDataRefetch;
    areCurrentSettingsValid = verifyBasePlotSettings<StackedPlotSettingTypes>;
    fetchData = fetchLogCurveData<StackedPlotSettingTypes>;
    settings = stackedPlotSettings;

    getDefaultSettingsValues(): Partial<SettingsTypeMap> {
        return {
            [Setting.SHOW_LABELS]: true,
            [Setting.SHOW_LINES]: true,
            [Setting.LABEL_ROTATION]: 90,
        };
    }

    makeProviderSnapshot(
        args: DataProviderInformationAccessors<StackedPlotSettingTypes, WellboreLogCurveData_api>,
    ): WellLogPlotProviderSnapshot {
        return {
            data: args.getData(),
            valueRange: null,
            dataLabel: args.getSetting(Setting.LOG_CURVE)?.curveName ?? null,
            meta: {
                color: null,
                plotVariant: null,
                showLabels: args.getSetting(Setting.SHOW_LABELS),
                showLines: args.getSetting(Setting.SHOW_LINES),
                labelRotation: args.getSetting(Setting.LABEL_ROTATION),
                colorScale: null,
            },
        };
    }

    // Uses the same external things as the other types
    defineDependencies(args: DefineDependenciesArgs<StackedPlotSettingTypes>) {
        const { valueConstraintsUpdater, helperDependency } = args;

        const headerQueryDeps = [
            WellLogCurveSourceEnum_api.SSDL_WELL_LOG,
            WellLogCurveSourceEnum_api.SMDA_GEOLOGY,
            WellLogCurveSourceEnum_api.SMDA_STRATIGRAPHY,
        ].map((source) =>
            helperDependency(async ({ getGlobalSetting, abortSignal }) => {
                const wellboreId = getGlobalSetting("wellboreUuid");

                if (!wellboreId) return null;

                return await args.queryClient.fetchQuery({
                    ...getWellboreLogCurveHeadersOptions({
                        query: { wellbore_uuid: wellboreId, sources: [source] },
                        signal: abortSignal,
                    }),
                });
            }),
        );

        valueConstraintsUpdater(Setting.LOG_CURVE, ({ getHelperDependency, getGlobalSetting }) => {
            const wellboreId = getGlobalSetting("wellboreUuid");
            const allHeaderData = headerQueryDeps.flatMap((dep) => getHelperDependency(dep));

            const headerData = allHeaderData.filter(
                (datum) => datum && datum.curveType !== WellLogCurveTypeEnum_api.CONTINUOUS,
            );

            if (!wellboreId || !headerData.length) return [];

            return headerData as WellboreLogCurveHeader_api[];
        });
    }

    getDefaultName() {
        return "Stacked plot";
    }
}
