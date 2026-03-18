import { makeSeriesId } from "../../../utils/seriesId";

export const PERCENTILE_CATEGORY = "percentile";

export function makePercentileSeriesId(traceName: string, qualifier: string, axisIndex: number): string {
    return makeSeriesId(PERCENTILE_CATEGORY, traceName, qualifier, axisIndex);
}