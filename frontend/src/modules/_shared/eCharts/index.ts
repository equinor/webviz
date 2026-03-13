// Types
export type {
    StatisticKey,
    TimeseriesStatistics,
    PointStatistics,
    TimeseriesTrace,
    DistributionTrace,
    BarTrace,
    HeatmapTrace,
    SubplotGroup,
    TimeseriesDisplayConfig,
    DistributionDisplayConfig,
    BarDisplayConfig,
    ContainerSize,
} from "./types";
export { ALL_STATISTIC_KEYS } from "./types";

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
    buildRealizationsSeries,
    buildStatisticsSeries,
    buildFanchartSeries,
    buildBarSeries,
    buildHistogramSeries,
    buildBoxPlotSeries,
    buildDistributionSeries,
    buildConvergenceSeries,
    buildHeatmapSeries,
} from "./series";
export type { BarSortBy, HistogramDisplayOptions, BoxPlotDisplayOptions, DistributionDisplayOptions } from "./series";

// Chart builders (compose series + layout into final EChartsOption)
export { buildTimeseriesChart, buildHeatmapChart, composeChartOption } from "./builders";
export type { TimeseriesChartResult, ComposeChartConfig } from "./builders";

// Interaction helpers
export {
    createTimestampMarkLine,
    applyActiveTimestampMarker,
    formatStatisticsTooltip,
    formatRealizationItemTooltip,
} from "./interaction";

// Hooks
export { useHighlightOnHover, useClickToTimestamp } from "./hooks";

// Statistics utilities
export { computePointStatistics, computeTimeseriesStatistics } from "./utils";
