export const HISTOGRAM_CATEGORY = "histogram";

export type HistogramRole = "primary" | "memberPoints";

/**
 * Format: chartType|role|traceName|axisIndex
 */
export function makeHistogramSeriesId(
    traceName: string,
    role: HistogramRole,
    axisIndex: number
): string {
    return `${HISTOGRAM_CATEGORY}|${role}|${traceName}|${axisIndex}`;
}