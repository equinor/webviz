import { makeSeriesId } from "../../core/seriesId";

export const HEATMAP_CATEGORY = "heatmap";

export type HeatmapRole = "primary";

export function makeHeatmapSeriesId(
    traceName: string,
    role: HeatmapRole,
    axisIndex: number
): string {
    return makeSeriesId({ chartType: HEATMAP_CATEGORY, role, name: traceName, subKey: "", axisIndex });
}