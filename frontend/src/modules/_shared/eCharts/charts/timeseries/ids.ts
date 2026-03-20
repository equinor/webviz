import { makeSeriesId } from "../../core/seriesId";

export const TIMESERIES_CATEGORY = "timeseries";

export function makeTimeseriesMemberSeriesId(
    highlightGroupKey: string,
    memberKey: number | string,
    axisIndex: number,
): string {
    return makeSeriesId({ chartType: TIMESERIES_CATEGORY, role: "member", name: highlightGroupKey, subKey: String(memberKey), axisIndex });
}

export function makeTimeseriesStatisticSeriesId(
    traceName: string,
    statKey: string,
    axisIndex: number
): string {
    return makeSeriesId({ chartType: TIMESERIES_CATEGORY, role: "summary", name: traceName, subKey: statKey, axisIndex });
}

export function makeTimeseriesBandSeriesId(
    traceName: string,
    bandKey: string,
    axisIndex: number
): string {
    return makeSeriesId({ chartType: TIMESERIES_CATEGORY, role: "band", name: traceName, subKey: bandKey, axisIndex });
}

export function makeTimeseriesHistorySeriesId(
    traceName: string,
    axisIndex: number
): string {
    return makeSeriesId({ chartType: TIMESERIES_CATEGORY, role: "reference", name: traceName, subKey: "", axisIndex });
}

export function makeTimeseriesObservationSeriesId(
    traceName: string,
    qualifier: string,
    axisIndex: number
): string {
    return makeSeriesId({ chartType: TIMESERIES_CATEGORY, role: "measurement", name: traceName, subKey: qualifier, axisIndex });
}