import type { LineSeriesOption } from "echarts/charts";

import { StatisticsType } from "../typesAndEnums";
import type { ChartTrace } from "../view/atoms/derivedAtoms";

type StatSeriesEntry = {
    statType: StatisticsType;
    key: "mean" | "p50" | "p10" | "p90" | "min" | "max";
    width: number;
    dash: "solid" | "dashed" | "dotted";
};

const STAT_SERIES_DEFS: StatSeriesEntry[] = [
    { statType: StatisticsType.Mean, key: "mean", width: 2, dash: "solid" },
    { statType: StatisticsType.P50, key: "p50", width: 1.5, dash: "dashed" },
    { statType: StatisticsType.P10, key: "p10", width: 1.5, dash: "dashed" },
    { statType: StatisticsType.P90, key: "p90", width: 1.5, dash: "dashed" },
    { statType: StatisticsType.Min, key: "min", width: 1.5, dash: "dotted" },
    { statType: StatisticsType.Max, key: "max", width: 1.5, dash: "dotted" },
];

/** Build line series for statistical traces (mean, percentiles, min/max). */
export function buildStatisticsSeries(
    trace: ChartTrace,
    selectedStatistics: StatisticsType[],
): LineSeriesOption[] {
    if (!trace.stats) return [];

    const series: LineSeriesOption[] = [];

    for (const def of STAT_SERIES_DEFS) {
        if (selectedStatistics.includes(def.statType)) {
            series.push({
                name: `${trace.label} ${def.statType}`,
                type: "line",
                data: trace.stats[def.key],
                itemStyle: { color: trace.color },
                lineStyle: { width: def.width, type: def.dash },
                symbol: "none",
            });
        }
    }

    return series;
}

/** Build the stacked P10-base + P90-P10 band area series for a fanchart. */
export function buildFanchartSeries(trace: ChartTrace): LineSeriesOption[] {
    if (!trace.stats) return [];
    const { p10, p90 } = trace.stats;

    // P10 <= P90 (standard percentile convention: p10 = 10th percentile = low).
    // Invisible base at P10, colored band of height (P90 - P10) stacked on top.
    return [
        {
            name: `${trace.label} P10 Base`,
            type: "line",
            data: p10,
            lineStyle: { opacity: 0 },
            areaStyle: { color: "transparent" },
            stack: `stack_${trace.label}`,
            symbol: "none",
            tooltip: { show: false },
        },
        {
            name: `${trace.label} P10-P90`,
            type: "line",
            data: p90.map((v, i) => v - p10[i]),
            lineStyle: { opacity: 0 },
            areaStyle: { color: trace.color, opacity: 0.15 },
            stack: `stack_${trace.label}`,
            symbol: "none",
            tooltip: { show: false },
        },
    ];
}
