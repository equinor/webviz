import type { WellboreLogCurveData_api } from "@api";
import { getLogCurveDataOptions, getWellboreLogCurveHeadersOptions } from "@api";
import type { FetchDataParams } from "@modules/_shared/LayerFramework/interfacesAndTypes/customDataLayerImplementation";
import type { DefineDependenciesArgs } from "@modules/_shared/LayerFramework/interfacesAndTypes/customSettingsHandler";
import { Setting, type Settings } from "@modules/_shared/LayerFramework/settings/settingsDefinitions";

export const baseSettings = [
    Setting.LOG_CURVE,
    // TODO: Only needed to infer track settings. Remove once we can define view visualizations
    Setting.TRACK_WIDTH,
] as const;

export const baseLinearSettings = [...baseSettings, Setting.SCALE /*, Setting.COLOR */] as const;
export const baseDiscreteSettings = [...baseSettings, Setting.SHOW_LINES, Setting.SHOW_LABELS, Setting.LABEL_DIR];

export function defineDependencies<T extends Settings>(args: DefineDependenciesArgs<T>) {
    const { availableSettingsUpdater, helperDependency } = args;

    const curveHeaderQueryDep = helperDependency(async ({ getGlobalSetting, abortSignal }) => {
        const wellboreId = getGlobalSetting("wellboreUuid") ?? "";
        return await args.queryClient.fetchQuery({
            ...getWellboreLogCurveHeadersOptions({
                query: { wellbore_uuid: wellboreId },
                signal: abortSignal,
            }),
        });
    });

    availableSettingsUpdater(Setting.LOG_CURVE, ({ getHelperDependency, getGlobalSetting }) => {
        const wellboreId = getGlobalSetting("wellboreUuid");
        const headerData = getHelperDependency(curveHeaderQueryDep);

        if (!wellboreId || !headerData) return [];

        return headerData;
    });
}

export function fetchData<T extends Settings>(
    args: FetchDataParams<T, WellboreLogCurveData_api>,
): Promise<WellboreLogCurveData_api> {
    const { getSetting, getGlobalSetting, queryClient } = args;

    const wellboreId = getGlobalSetting("wellboreUuid");
    const curveHeader = getSetting(Setting.LOG_CURVE);

    if (!wellboreId || !curveHeader) return Promise.reject();

    return queryClient.fetchQuery({
        ...getLogCurveDataOptions({
            query: {
                wellbore_uuid: wellboreId,
                curve_name: curveHeader.curveName,
                log_name: curveHeader.logName,
            },
        }),
    });
}
