import type { WellboreLogCurveData_api, WellboreLogCurveHeader_api } from "@api";
import { WellLogCurveSourceEnum_api, WellLogCurveTypeEnum_api, getWellboreLogCurveHeadersOptions } from "@api";
import type { CustomDataProviderImplementation } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { DefineDependenciesArgs } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import { type MakeSettingTypesMap, Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import {
    baseDiscreteSettings,
    doSettingsChangesRequireDataRefetch,
    fetchLogCurveData,
    verifyBasePlotSettings,
} from "./_shared";

export const stackedPlotSettings = [...baseDiscreteSettings, Setting.LABEL_ROTATION] as const;
export type StackedPlotSettingTypes = typeof stackedPlotSettings;
type SettingsTypeMap = MakeSettingTypesMap<StackedPlotSettingTypes>;

export class StackedPlotProvider
    implements CustomDataProviderImplementation<StackedPlotSettingTypes, WellboreLogCurveData_api>
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

    // Uses the same external things as the other types
    defineDependencies(args: DefineDependenciesArgs<StackedPlotSettingTypes>) {
        const { availableSettingsUpdater, helperDependency } = args;

        const headerQueryDeps = [
            WellLogCurveSourceEnum_api.SSDL_WELL_LOG,
            WellLogCurveSourceEnum_api.SMDA_GEOLOGY,
            WellLogCurveSourceEnum_api.SMDA_STRATIGRAPHY,
        ].map((source) =>
            helperDependency(async ({ getGlobalSetting, abortSignal }) => {
                const wellboreId = getGlobalSetting("wellboreUuid") ?? "";

                return await args.queryClient.fetchQuery({
                    ...getWellboreLogCurveHeadersOptions({
                        query: { wellbore_uuid: wellboreId, sources: [source] },
                        signal: abortSignal,
                    }),
                });
            }),
        );

        availableSettingsUpdater(Setting.LOG_CURVE, ({ getHelperDependency, getGlobalSetting }) => {
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
