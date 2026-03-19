export const TIMESERIES_CATEGORY = "timeseries";

/**
 * Format: chartType|role|traceNameOrGroupKey|axisIndex|subKey
 */

export function makeTimeseriesMemberSeriesId(
    highlightGroupKey: string,
    memberKey: number | string,
    axisIndex: number,
): string {
    return `${TIMESERIES_CATEGORY}|member|${highlightGroupKey}|${axisIndex}|${String(memberKey)}`;
}

export function makeTimeseriesStatisticSeriesId(
    traceName: string,
    statKey: string,
    axisIndex: number
): string {
    return `${TIMESERIES_CATEGORY}|summary|${traceName}|${axisIndex}|${statKey}`;
}

export function makeTimeseriesBandSeriesId(
    traceName: string,
    bandKey: string,
    axisIndex: number
): string {
    return `${TIMESERIES_CATEGORY}|band|${traceName}|${axisIndex}|${bandKey}`;
}

export function makeTimeseriesHistorySeriesId(
    traceName: string,
    axisIndex: number
): string {
    return `${TIMESERIES_CATEGORY}|reference|${traceName}|${axisIndex}|`; // Empty subKey
}

export function makeTimeseriesObservationSeriesId(
    traceName: string,
    qualifier: string,
    axisIndex: number
): string {
    return `${TIMESERIES_CATEGORY}|measurement|${traceName}|${axisIndex}|${qualifier}`;
}