// Types
export { ALL_STATISTIC_KEYS, HistogramType } from "./types";
export type {
    BarDisplayConfig,
    BarTrace,
    ContainerSize,
    DensityDisplayConfig,
    DistributionTrace,
    HeatmapTrace,
    ReferenceLineShape,
    ReferenceLineTrace,
    MemberScatterTrace,
    PointAnnotation,
    PointAnnotationTrace,
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
export { buildMemberScatterInteractionSeries, buildMemberScatterSeries } from "./charts/memberScatter";
export { buildPercentileRangeSeries, type PercentileRangeCenterStatistic, type PercentileRangeDisplayOptions } from "./charts/percentileRange";
export {
    buildFanchartSeries,
    buildPointAnnotationSeries,
    buildMemberSeries,
    buildReferenceLineSeries,
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

// Interaction
export { makeInteractionLookupKey } from "./interaction";
export type {
    HoveredSeriesInfo,
    InteractionSeries,
    InteractionSeriesEntry,
    MemberSeriesInteractionEntry,
    PointAnnotationInteractionSeriesEntry,
    ReferenceLineInteractionSeriesEntry,
    StatisticInteractionSeriesEntry,
} from "./interaction";

// Hooks
export { useChartZoomSync, useClickToTimestamp, useSeriesInteraction } from "./hooks";
export type {
    SeriesInteractionEvents,
    SeriesInteractionOptions,
} from "./hooks";

export { buildTimeseriesInteractionSeries } from "./charts/timeseries";

// Statistics & Math Utilities
export {
    computeHistogramLayout,
    computeHistogramTraceData,
    computePointStatistics,
    computeTimeseriesStatistics,
} from "./utils";