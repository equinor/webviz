import { makeSeriesId } from "../../core/seriesId";

export const HISTOGRAM_CATEGORY = "histogram";

export type HistogramRole = "primary" | "memberPoints" | "stat";

export function makeHistogramSeriesId(
    traceName: string,
    role: HistogramRole,
    axisIndex: number,
    subKey = ""
): string {
    return makeSeriesId({ chartType: HISTOGRAM_CATEGORY, role, name: traceName, subKey, axisIndex });
}