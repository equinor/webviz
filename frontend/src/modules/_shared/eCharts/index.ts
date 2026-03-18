// Types
export type {
    StatisticKey,
    TimeseriesStatistics,
    PointStatistics,
    TimeseriesTrace,
    HistoricalLineShape,
    HistoricalTrace,
    ObservationPoint,
    ObservationTrace,
    TimeseriesSubplotOverlays,
    DistributionTrace,
    BarTrace,
    HeatmapTrace,
    MemberScatterTrace,
    SubplotGroup,
    TimeseriesDisplayConfig,
    DensityDisplayConfig,
    BarDisplayConfig,
    ContainerSize,
} from "./types";
export { ALL_STATISTIC_KEYS, HistogramType } from "./types";

// Layout
export { computeSubplotGridLayout, DEFAULT_LAYOUT_CONFIG, buildSubplotAxes, getResponsiveFeatures } from "./layout";
export type {
    SubplotLayoutConfig,
    SubplotLayoutResult,
    SubplotCell,
    GridEntry,
    AxisDef,
    SubplotAxisDef,
    SubplotAxesResult,
    ResponsiveFeatures,
} from "./layout";

// Series builders
export {
    buildMemberSeries,
    buildStatisticsSeries,
    buildFanchartSeries,
    buildHistorySeries,
    buildObservationSeries,
} from "./charts//timeseries";
export {
    buildBarSeries,
} from "./charts//bar";
export {
    buildHistogramSeries,
} from "./charts//histogram";
export {
    buildExceedanceSeries,
} from "./charts//exceedance";
export {
    buildPercentileRangeSeries,
} from "./charts//percentileRange";
export {
    buildDensitySeries,
} from "./charts//density";
export {
    buildConvergenceSeries,
} from "./charts//convergence";
export {
    buildHeatmapSeries,
} from "./charts//heatmap";
export {
    buildMemberScatterSeries,
} from "./charts//memberScatter";
export type { BarSortBy } from "./charts//bar";
export type { HistogramDisplayOptions } from "./charts//histogram";
export type {
    PercentileRangeCenterStatistic,
    PercentileRangeDisplayOptions,
} from "./charts//percentileRange";
export type { DensityDisplayOptions } from "./charts//density";

// Chart builders (compose series + layout into final EChartsOption)
export {
    buildTimeseriesChart,
    extractTimeseriesCategoryData,
    buildHeatmapChart,
    buildBarChart,
    buildDensityChart,
    buildHistogramChart,
    buildExceedanceChart,
    buildPercentileRangeChart,
    buildConvergenceChart,
    buildMemberScatterChart,
} from "./charts/";
export { composeChartOption } from "./core";
export type { ComposeChartConfig, ChartSeriesOption, SeriesBuildResult } from "./core";

// Overlay helpers
export { createTimestampMarkLine, applyActiveTimestampMarker } from "./overlays";

// Hooks
export { useHighlightOnHover, useClickToTimestamp, useClosestMemberTooltip } from "./hooks";
export type { HoveredMemberInfo } from "./hooks";

// Statistics utilities
export {
    computePointStatistics,
    computeTimeseriesStatistics,
    computeHistogramLayout,
    computeHistogramTraceData,
} from "./utils";
