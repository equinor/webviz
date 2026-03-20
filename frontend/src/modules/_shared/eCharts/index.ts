// Types
export { ALL_STATISTIC_KEYS, HistogramType } from "./types";
export type {
    BarDisplayConfig,
    BarTrace,
    ContainerSize,
    DensityDisplayConfig,
    DistributionTrace,
    HeatmapTrace,
    HistoricalLineShape,
    HistoricalTrace,
    MemberScatterTrace,
    ObservationPoint,
    ObservationTrace,
    PointStatistics,
    StatisticKey,
    SubplotGroup,
    TimeseriesDisplayConfig,
    TimeseriesStatistics,
    TimeseriesSubplotOverlays,
    TimeseriesTrace,
    BaseChartOptions
} from "./types";

// Layout
export { buildSubplotAxes, computeSubplotGridLayout, DEFAULT_LAYOUT_CONFIG, getResponsiveFeatures } from "./layout";
export type {
    AxisDef,
    GridEntry,
    ResponsiveFeatures,
    SubplotAxesResult,
    SubplotAxisDef,
    SubplotCell,
    SubplotLayoutConfig,
    SubplotLayoutResult,
} from "./layout";

// Core
export { composeChartOption } from "./core";
export type { ChartSeriesOption, ComposeChartConfig, SeriesBuildResult } from "./core";
export { makeSeriesId, parseSeriesId } from "./core";
export type { SeriesIdFields } from "./core";

// Series Builders & Chart Options
export { buildBarSeries, type BarSortBy } from "./charts/bar";
export { buildConvergenceSeries } from "./charts/convergence";
export { buildDensitySeries, type DensityDisplayOptions } from "./charts/density";
export { buildExceedanceSeries } from "./charts/exceedance";
export { buildHeatmapSeries } from "./charts/heatmap";
export { buildHistogramSeries, type HistogramDisplayOptions } from "./charts/histogram";
export { buildMemberScatterSeries } from "./charts/memberScatter";
export { buildPercentileRangeSeries, type PercentileRangeCenterStatistic, type PercentileRangeDisplayOptions } from "./charts/percentileRange";
export {
    buildFanchartSeries,
    buildHistorySeries,
    buildMemberSeries,
    buildObservationSeries,
    buildStatisticsSeries,
} from "./charts/timeseries";

// Chart Composition Builders
export {
    buildBarChart,
    buildConvergenceChart,
    buildDensityChart,
    buildExceedanceChart,
    buildHeatmapChart,
    buildHistogramChart,
    buildMemberScatterChart,
    buildPercentileRangeChart,
    buildTimeseriesChart,
    extractTimeseriesCategoryData,
} from "./charts/";

// Overlays
export { applyActiveTimestampMarker, createTimestampMarkLine } from "./overlays";

// Hooks
export { useClickToTimestamp, useMemberInteraction } from "./hooks";
export type { HoveredMemberInfo, MemberInteractionEvents, MemberInteractionOptions } from "./hooks";

// Statistics & Math Utilities
export {
    computeHistogramLayout,
    computeHistogramTraceData,
    computePointStatistics,
    computeTimeseriesStatistics,
} from "./utils";