export const PERCENTILE_CATEGORY = "percentile";

export function makePercentileSeriesId(traceName: string, qualifier: string, axisIndex: number): string {
    return `${PERCENTILE_CATEGORY}:${traceName}:${qualifier}:${axisIndex}`;
}