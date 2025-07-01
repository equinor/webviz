import { isEqual } from "lodash";

import type { WellboreLogCurveData_api } from "@api";
import {
    WellLogCurveSourceEnum_api,
    WellLogCurveTypeEnum_api,
    getLogCurveDataOptions,
    getWellboreLogCurveHeadersOptions,
} from "@api";
import type {
    DataProviderInformationAccessors,
    FetchDataParams,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { DefineDependenciesArgs } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import type {
    MakeSettingTypesMap,
    Settings,
} from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

export const baseSettings = [Setting.LOG_CURVE] as const;
export type BaseSettingsTypeMap = MakeSettingTypesMap<typeof baseSettings>;

export const baseContinuousSettings = [...baseSettings, Setting.SCALE, Setting.COLOR] as const;
export const baseDiscreteSettings = [
    ...baseSettings,
    // These might be a bit too specific to the stacked plot.
    // Consider moving this if/when we introduce other discrete curves.
    Setting.SHOW_LINES,
    Setting.SHOW_LABELS,
    Setting.LABEL_ROTATION,
] as const;

export function defineBaseContinuousDependencies<T extends readonly Setting[]>(args: DefineDependenciesArgs<T>) {
    const { availableSettingsUpdater, helperDependency } = args;

    const curveHeaderQueryDep = helperDependency(async ({ getGlobalSetting, abortSignal }) => {
        const wellboreId = getGlobalSetting("wellboreUuid") ?? "";

        return await args.queryClient.fetchQuery({
            ...getWellboreLogCurveHeadersOptions({
                query: {
                    wellbore_uuid: wellboreId,
                    sources: [WellLogCurveSourceEnum_api.SSDL_WELL_LOG, WellLogCurveSourceEnum_api.SMDA_SURVEY],
                },
                signal: abortSignal,
            }),
        });
    });

    availableSettingsUpdater(Setting.LOG_CURVE, ({ getHelperDependency, getGlobalSetting }) => {
        const wellboreId = getGlobalSetting("wellboreUuid");
        const headerData = getHelperDependency(curveHeaderQueryDep);

        if (!wellboreId || !headerData) return [];

        return headerData.filter((curve) => curve.curveType !== WellLogCurveTypeEnum_api.DISCRETE);
    });
}

export function verifyBasePlotSettings<T extends readonly Setting[]>(
    accessor: DataProviderInformationAccessors<T, WellboreLogCurveData_api>,
): boolean {
    const availableCurves = accessor.getAvailableSettingValues(Setting.LOG_CURVE) ?? [];
    const selectedCurve = accessor.getSetting(Setting.LOG_CURVE);

    return !!selectedCurve && !!availableCurves.find((curve) => curve.curveName === selectedCurve.curveName);
}

export function fetchLogCurveData<T extends Settings>(
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
                source: curveHeader.source,
            },
        }),
    });
}

export function doSettingsChangesRequireDataRefetch<T extends BaseSettingsTypeMap>(
    prevSettings: T | null,
    newSettings: T | null,
): boolean {
    return !isEqual(prevSettings?.logCurve, newSettings?.logCurve);
}
