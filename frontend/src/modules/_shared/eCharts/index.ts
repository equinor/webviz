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
    buildBarSeries,
    buildHistogramSeries,
    buildExceedanceSeries,
    buildPercentileRangeSeries,
    buildDensitySeries,
    buildConvergenceSeries,
    buildHeatmapSeries,
    buildMemberScatterSeries,
} from "./series";
export type {
    BarSortBy,
    HistogramDisplayOptions,
    PercentileRangeCenterStatistic,
    PercentileRangeDisplayOptions,
    DensityDisplayOptions,
} from "./series";

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
export { useHighlightOnHover, useClickToTimestamp, useTimeseriesInteractions } from "./hooks";
export type { TimeseriesInteractionConfig, TimeseriesInteractionResult, HoveredMemberInfo } from "./hooks";

// Statistics utilities
export {
    computePointStatistics,
    computeTimeseriesStatistics,
    computeHistogramLayout,
    computeHistogramTraceData,
} from "./utils";
