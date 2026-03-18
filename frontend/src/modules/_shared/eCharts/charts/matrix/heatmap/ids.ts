export const HEATMAP_CATEGORY = "heatmap";

export function makeHeatmapSeriesId(traceName: string, qualifier: string, axisIndex: number): string {
    return `${HEATMAP_CATEGORY}:${traceName}:${qualifier}:${axisIndex}`;
}