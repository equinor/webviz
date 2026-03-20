export const TIMESERIES_CATEGORY = "timeseries";

/**
 * Format: chartType|role|traceNameOrGroupKey|subKey|axisIndex
 */

export function makeTimeseriesMemberSeriesId(
    highlightGroupKey: string,
    memberKey: number | string,
    axisIndex: number,
): string {
    return `${TIMESERIES_CATEGORY}|member|${highlightGroupKey}|${String(memberKey)}|${axisIndex}`;
}

export function makeTimeseriesStatisticSeriesId(
    traceName: string,
    statKey: string,
    axisIndex: number
): string {
    return `${TIMESERIES_CATEGORY}|summary|${traceName}|${statKey}|${axisIndex}`;
}

export function makeTimeseriesBandSeriesId(
    traceName: string,
    bandKey: string,
    axisIndex: number
): string {
    return `${TIMESERIES_CATEGORY}|band|${traceName}|${bandKey}|${axisIndex}`;
}

export function makeTimeseriesHistorySeriesId(
    traceName: string,
    axisIndex: number
): string {
    return `${TIMESERIES_CATEGORY}|reference|${traceName}||${axisIndex}`; // Empty subKey
}

export function makeTimeseriesObservationSeriesId(
    traceName: string,
    qualifier: string,
    axisIndex: number
): string {
    return `${TIMESERIES_CATEGORY}|measurement|${traceName}|${qualifier}|${axisIndex}`;
}