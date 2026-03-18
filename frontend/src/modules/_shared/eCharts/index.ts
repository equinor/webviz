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
} from "./charts/timeseries/timeseries";
export {
    buildBarSeries,
} from "./charts/categorical/bar";
export {
    buildHistogramSeries,
} from "./charts/distribution/histogram";
export {
    buildExceedanceSeries,
} from "./charts/distribution/exceedance";
export {
    buildPercentileRangeSeries,
} from "./charts/distribution/percentileRange";
export {
    buildDensitySeries,
} from "./charts/distribution/density";
export {
    buildConvergenceSeries,
} from "./charts/distribution/convergence";
export {
    buildHeatmapSeries,
} from "./charts/matrix/heatmap";
export {
    buildMemberScatterSeries,
} from "./charts/scatter/memberScatter";
export type { BarSortBy } from "./charts/categorical/bar";
export type { HistogramDisplayOptions } from "./charts/distribution/histogram";
export type {
    PercentileRangeCenterStatistic,
    PercentileRangeDisplayOptions,
} from "./charts/distribution/percentileRange";
export type { DensityDisplayOptions } from "./charts/distribution/density";

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
} from "./charts/index";
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
