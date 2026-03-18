export function makeTimeseriesMemberSeriesId(
    highlightGroupKey: string,
    memberKey: number | string,
    axisIndex: number,
): string {
    return `realization:${highlightGroupKey}:${String(memberKey)}:${axisIndex}`;
}

export function makeTimeseriesStatisticSeriesId(traceName: string, statKey: string, axisIndex: number): string {
    return `statistic:${traceName}:${statKey}:${axisIndex}`;
}

export function makeTimeseriesBandSeriesId(traceName: string, bandKey: string, axisIndex: number): string {
    return `fanchart:${traceName}:${bandKey}:${axisIndex}`;
}

export function makeTimeseriesHistorySeriesId(traceName: string, axisIndex: number): string {
    return `history:${traceName}:line:${axisIndex}`;
}

export function makeTimeseriesObservationSeriesId(traceName: string, qualifier: string, axisIndex: number): string {
    return `observation:${traceName}:${qualifier}:${axisIndex}`;
}