export const HEATMAP_CATEGORY = "heatmap";

export type HeatmapRole = "primary";

/**
 * Format: chartType|role|traceName|axisIndex
 */
export function makeHeatmapSeriesId(
    traceName: string,
    role: HeatmapRole,
    axisIndex: number
): string {
    return `${HEATMAP_CATEGORY}|${role}|${traceName}|${axisIndex}`;
}