import type { WellboreLogCurveData_api, WellboreLogCurveHeader_api } from "@api";
import { WellLogCurveSourceEnum_api, WellLogCurveTypeEnum_api, getWellboreLogCurveHeadersOptions } from "@api";
import type { CustomDataProviderImplementation } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { SetupBasicBindingsContext } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/utils";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import {
    baseDiscreteSettings,
    doSettingsChangesRequireDataRefetch,
    fetchLogCurveData,
    verifyBasePlotSettings,
} from "./_shared";

export const stackedPlotSettings = [...baseDiscreteSettings, Setting.LABEL_ROTATION] as const;
export type StackedPlotSettingTypes = typeof stackedPlotSettings;
type SettingsTypeMap = MakeSettingTypesMap<StackedPlotSettingTypes>;

export class StackedPlotProvider implements CustomDataProviderImplementation<
    StackedPlotSettingTypes,
    WellboreLogCurveData_api
> {
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

    setupBindings({ setting, makeSharedResult, queryClient }: SetupBasicBindingsContext<StackedPlotSettingTypes>) {
        const makeCurveHeaderDep = (source: WellLogCurveSourceEnum_api) =>
            makeSharedResult({
                debugName: `CurveHeaders_${source}`,
                read(read) {
                    return { wellboreId: read.globalSetting("wellboreUuid") };
                },
                async resolve({ wellboreId }, { abortSignal }) {
                    if (!wellboreId) return null;

                    return await queryClient.fetchQuery({
                        ...getWellboreLogCurveHeadersOptions({
                            query: { wellbore_uuid: wellboreId, sources: [source] },
                            signal: abortSignal,
                        }),
                    });
                },
            });

        const ssdlDep = makeCurveHeaderDep(WellLogCurveSourceEnum_api.SSDL_WELL_LOG);
        const geologyDep = makeCurveHeaderDep(WellLogCurveSourceEnum_api.SMDA_GEOLOGY);
        const stratigraphyDep = makeCurveHeaderDep(WellLogCurveSourceEnum_api.SMDA_STRATIGRAPHY);

        setting(Setting.LOG_CURVE).bindValueConstraints({
            read(read) {
                return {
                    wellboreId: read.globalSetting("wellboreUuid"),
                    ssdlHeaders: read.sharedResult(ssdlDep),
                    geologyHeaders: read.sharedResult(geologyDep),
                    stratigraphyHeaders: read.sharedResult(stratigraphyDep),
                };
            },
            resolve({ wellboreId, ssdlHeaders, geologyHeaders, stratigraphyHeaders }) {
                const headerData = [
                    ...(ssdlHeaders ?? []),
                    ...(geologyHeaders ?? []),
                    ...(stratigraphyHeaders ?? []),
                ].filter((datum) => datum.curveType !== WellLogCurveTypeEnum_api.CONTINUOUS);

                if (!wellboreId || !headerData.length) return [];

                return headerData as WellboreLogCurveHeader_api[];
            },
        });
    }

    getDefaultName() {
        return "Stacked plot";
    }
}
