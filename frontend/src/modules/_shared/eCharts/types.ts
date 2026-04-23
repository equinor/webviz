import type { ChartZoomState } from "./core/composeChartOption";

export type StatisticKey = "mean" | "p10" | "p50" | "p90" | "min" | "max";

export const ALL_STATISTIC_KEYS: readonly StatisticKey[] = ["mean", "p10", "p50", "p90", "min", "max"] as const;

/** Per-timestep statistics. Each array has length = number of timesteps. */
export type TimeseriesStatistics = Record<StatisticKey, number[]>;

export type PointStatistics = Record<StatisticKey, number> & {
    count: number;
    stdDev: number;
};

/**
 * Can carry both memberValues AND statistics simultaneously.
 * The display config controls what gets rendered.
 */
export type ReferenceLineShape = "linear" | "hv" | "vh";

export interface TimeseriesTrace {
    name: string;
    color: string;
    timestamps: number[];
    highlightGroupKey?: string;
    memberValues?: number[][];
    memberIds?: number[];
    /** Per-member colors. Length must match memberValues. Overrides trace.color per member. */
    memberColors?: string[];
    statistics?: TimeseriesStatistics;
    /**
     * Line interpolation shape for all lines rendered from this trace (members,
     * statistics, fanchart band edges). Defaults to "linear".
     */
    lineShape?: ReferenceLineShape;
}

export interface ReferenceLineTrace {
    name: string;
    color: string;
    timestamps: number[];
    values: number[];
    lineShape?: ReferenceLineShape;
}

export interface PointAnnotation {
    date: number;
    value: number;
    error: number;
    label: string;
    comment?: string;
}

export interface PointAnnotationTrace {
    name: string;
    color: string;
    annotations: PointAnnotation[];
}

export interface TimeseriesSubplotOverlays {
    referenceLineTraces: ReferenceLineTrace[];
    pointAnnotationTraces: PointAnnotationTrace[];
}

export interface DistributionTrace {
    name: string;
    color: string;
    values: number[];
    memberIds?: number[];
    /** Per-member colors. Length must match values. Overrides trace.color per member point. */
    memberColors?: string[];
}

export interface BarTrace {
    name: string;
    color: string;
    categories: (string | number)[];
    values: number[];
}

export interface HeatmapTrace {
    name: string;
    xLabels: string[];
    yLabels: string[];
    timestampsUtcMs: number[];
    data: [number, number, number][];
    minValue: number;
    maxValue: number;
}

export interface SubplotGroup<T> {
    title: string;
    traces: T[];
}

export interface TimeseriesDisplayConfig {
    showMembers: boolean;
    showStatistics: boolean;
    showFanchart: boolean;
    showReferenceLines: boolean;
    showPointAnnotations: boolean;
    selectedStatistics: StatisticKey[];
    /**
     * Total member-point budget for the chart. When the sum of
     * (members × timesteps) across all traces exceeds this number,
     * all member series switch to the fast custom-polyline renderer
     * (no per-line interaction). Defaults to 100 000.
     */
    largeMemberPointBudget?: number;
}

export interface MemberScatterTrace {
    name: string;
    color: string;
    highlightGroupKey?: string;
    memberIds: number[];
    /** Per-member colors. Length must match memberIds. Overrides trace.color per member. */
    memberColors?: string[];
    xValues: number[];
    yValues: number[];
}

export enum HistogramType {
    Stack = "stack",
    Group = "group",
    Overlay = "overlay",
    Relative = "relative",
}
export interface BaseChartOptions {
    zoomState?: ChartZoomState;
    /** Enable mouse-wheel / pinch zoom. When true, the builder auto-creates inside dataZoom components. Defaults to false. */
    zoomable?: boolean;
    sharedXAxis?: boolean;
    sharedYAxis?: boolean;
    /** Draw a border around matching subplot grids. Indices are zero-based and refer to the filtered non-empty subplot order. */
    highlightedSubplotIndices?: number[];
    /** X-axis label override. Builders provide their own defaults when omitted. */
    xAxisLabel?: string;
    /** Y-axis label override. Builders provide their own defaults when omitted. */
    yAxisLabel?: string;
    /** Force legend visible/hidden. Defaults to auto (shown when legendData is non-empty). */
    showLegend?: boolean;
}