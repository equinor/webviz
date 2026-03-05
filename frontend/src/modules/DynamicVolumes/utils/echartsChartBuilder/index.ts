export { buildTimeseriesOptions } from "./timeseriesOptionsBuilder";
export type { TimeseriesEchartsResult } from "./timeseriesOptionsBuilder";

export { buildHeatmapOptions } from "./heatmapOptionsBuilder";

export { computeSubplotGridLayout } from "./subplotGridLayout";
export type { SubplotLayoutConfig, SubplotLayoutResult, SubplotCell, GridEntry } from "./subplotGridLayout";

// ── Responsive size helpers ──

export type ContainerSize = { width: number; height: number };

/** Minimum container height (px) to show slider dataZoom controls. */
export const MIN_HEIGHT_FOR_SLIDERS = 300;
/** Minimum container width (px) to show slider dataZoom controls. */
export const MIN_WIDTH_FOR_SLIDERS = 400;
/** Minimum container height (px) to show the toolbox. */
export const MIN_HEIGHT_FOR_TOOLBOX = 200;
/** Minimum container width (px) to show the legend. */
export const MIN_HEIGHT_FOR_LEGEND = 250;
