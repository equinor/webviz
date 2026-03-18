import {
    makeFanchartSeriesId,
    makeHistorySeriesId,
    makeObservationSeriesId,
    makeRealizationSeriesId,
    makeStatisticSeriesId,
} from "../../../utils/seriesId";

export function makeTimeseriesMemberSeriesId(
    highlightGroupKey: string,
    memberKey: number | string,
    axisIndex: number,
): string {
    return makeRealizationSeriesId(highlightGroupKey, memberKey, axisIndex);
}

export function makeTimeseriesStatisticSeriesId(traceName: string, statKey: string, axisIndex: number): string {
    return makeStatisticSeriesId(traceName, statKey, axisIndex);
}

export function makeTimeseriesBandSeriesId(traceName: string, bandKey: string, axisIndex: number): string {
    return makeFanchartSeriesId(traceName, bandKey, axisIndex);
}

export function makeTimeseriesHistorySeriesId(traceName: string, axisIndex: number): string {
    return makeHistorySeriesId(traceName, axisIndex);
}

export function makeTimeseriesObservationSeriesId(traceName: string, qualifier: string, axisIndex: number): string {
    return makeObservationSeriesId(traceName, qualifier, axisIndex);
}