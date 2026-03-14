export type StatisticKey = "mean" | "p10" | "p50" | "p90" | "min" | "max";

export const ALL_STATISTIC_KEYS: readonly StatisticKey[] = ["mean", "p10", "p50", "p90", "min", "max"] as const;

/** Per-timestep statistics. Each array has length = number of timesteps. */
export type TimeseriesStatistics = Record<StatisticKey, number[]>;

export type PointStatistics = Record<StatisticKey, number> & {
    count: number;
    stdDev: number;
};

/**
 * Can carry both realizationValues AND statistics simultaneously.
 * The display config controls what gets rendered.
 */
export interface TimeseriesTrace {
    name: string;
    color: string;
    timestamps: number[];
    highlightGroupKey?: string;
    realizationValues?: number[][];
    realizationIds?: number[];
    statistics?: TimeseriesStatistics;
}

export interface DistributionTrace {
    name: string;
    color: string;
    values: number[];
    realizationIds?: number[];
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

export interface SubplotGroup<T = TimeseriesTrace> {
    title: string;
    traces: T[];
}

export interface TimeseriesDisplayConfig {
    showRealizations: boolean;
    showStatistics: boolean;
    showFanchart: boolean;
    selectedStatistics: StatisticKey[];
}

export interface DensityDisplayConfig {
    showStatisticalMarkers: boolean;
    showRealizationPoints: boolean;
}

export interface BarDisplayConfig {
    sortBy: "categories" | "values";
    showStatisticalMarkers: boolean;
    maxLabelsForText: number;
}

export interface ContainerSize {
    width: number;
    height: number;
}

export interface RealizationScatterTrace {
    name: string;
    color: string;
    highlightGroupKey?: string;
    realizationIds: number[];
    xValues: number[];
    yValues: number[];
}

export enum HistogramType {
    Stack = "stack",
    Group = "group",
    Overlay = "overlay",
    Relative = "relative",
}
