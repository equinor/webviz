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
} from "./families/timeseries/timeseries";
export {
    buildBarSeries,
} from "./families/categorical/bar";
export {
    buildHistogramSeries,
} from "./families/distribution/histogram";
export {
    buildExceedanceSeries,
} from "./families/distribution/exceedance";
export {
    buildPercentileRangeSeries,
} from "./families/distribution/percentileRange";
export {
    buildDensitySeries,
} from "./families/distribution/density";
export {
    buildConvergenceSeries,
} from "./families/distribution/convergence";
export {
    buildHeatmapSeries,
} from "./families/matrix/heatmap";
export {
    buildMemberScatterSeries,
} from "./families/scatter/memberScatter";
export type { BarSortBy } from "./families/categorical/bar";
export type { HistogramDisplayOptions } from "./families/distribution/histogram";
export type {
    PercentileRangeCenterStatistic,
    PercentileRangeDisplayOptions,
} from "./families/distribution/percentileRange";
export type { DensityDisplayOptions } from "./families/distribution/density";

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
    composeChartOption,
} from "./builders";
export type { ComposeChartConfig, ChartSeriesOption, SeriesBuildResult } from "./builders";

// Interaction helpers
export { createTimestampMarkLine, applyActiveTimestampMarker } from "./interaction";

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
