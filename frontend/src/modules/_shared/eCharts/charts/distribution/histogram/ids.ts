export const HISTOGRAM_CATEGORY = "histogram";

export function makeHistogramSeriesId(traceName: string, qualifier: string, axisIndex: number): string {
    return `${HISTOGRAM_CATEGORY}:${traceName}:${qualifier}:${axisIndex}`;
}