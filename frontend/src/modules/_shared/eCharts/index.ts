// Types
export { ALL_STATISTIC_KEYS, HistogramType } from "./types";
export type {
    BarTrace,
    DistributionTrace,
    HeatmapTrace,
    MemberScatterTrace,
    PointAnnotationTrace,
    ReferenceLineTrace,
    StatisticKey,
    SubplotGroup,
    TimeseriesDisplayConfig,
    TimeseriesSubplotOverlays,
    TimeseriesTrace,
    BaseChartOptions,
} from "./types";

// Layout
export { computeSubplotGridLayout } from "./layout";

// Core
export { buildCartesianSubplotChart } from "./core";
export type {
    CartesianSubplotBuildResult,
    ChartZoomState,
} from "./core";

// Chart Builders
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
} from "./charts/";

// Interaction
export { buildMemberScatterInteractionSeries } from "./charts/memberScatter";
export { buildTimeseriesInteractionSeries } from "./charts/timeseries";
export type { HoveredSeriesInfo } from "./interaction";

// Hooks
export { useChartZoomSync, useTimestampSelection, useSeriesInteraction } from "./hooks";

// Utilities
export { computeTimeseriesStatistics } from "./utils";

// Components
export { Chart } from "./components/Chart";