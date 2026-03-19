export const PERCENTILE_CATEGORY = "percentile";

export type PercentileRole = "summary" | "memberPoints";

/**
 * Format: chartType|role|traceName|axisIndex
 */
export function makePercentileSeriesId(
    traceName: string,
    role: PercentileRole,
    axisIndex: number
): string {
    return `${PERCENTILE_CATEGORY}|${role}|${traceName}|${axisIndex}`;
}