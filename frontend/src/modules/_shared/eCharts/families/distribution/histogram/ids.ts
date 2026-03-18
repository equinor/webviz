import { makeSeriesId } from "../../../utils/seriesId";

export const HISTOGRAM_CATEGORY = "histogram";

export function makeHistogramSeriesId(traceName: string, qualifier: string, axisIndex: number): string {
    return makeSeriesId(HISTOGRAM_CATEGORY, traceName, qualifier, axisIndex);
}