import { makeSeriesId } from "../../../utils/seriesId";

export const HEATMAP_CATEGORY = "heatmap";

export function makeHeatmapSeriesId(traceName: string, qualifier: string, axisIndex: number): string {
    return makeSeriesId(HEATMAP_CATEGORY, traceName, qualifier, axisIndex);
}