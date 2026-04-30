import { makeSeriesId } from "../../core/seriesId";

export const PERCENTILE_CATEGORY = "percentile";

export type PercentileRole = "summary" | "memberPoints";

export function makePercentileSeriesId(
    traceName: string,
    role: PercentileRole,
    axisIndex: number
): string {
    return makeSeriesId({ chartType: PERCENTILE_CATEGORY, role, name: traceName, subKey: "", axisIndex });
}