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
    axisIndex = 0,
): LineSeriesOption[] {
    if (!trace.stats) return [];

    const series: LineSeriesOption[] = [];

    for (const def of STAT_SERIES_DEFS) {
        if (selectedStatistics.includes(def.statType)) {
            series.push({
                id: `${trace.label}_${def.statType}_${axisIndex}`,
                name: trace.label,
                type: "line",
                data: trace.stats[def.key],
                xAxisIndex: axisIndex,
                yAxisIndex: axisIndex,
                itemStyle: { color: trace.color },
                lineStyle: { width: def.width, type: def.dash },
                symbol: "none",
            });
        }
    }

    return series;
}

/**
 * Create a filled polygon band between two y-value arrays.
 * Uses a custom series to draw the polygon directly, which handles negative
 * values correctly (unlike the stacked-area approach that mis-renders when
 * the baseline is below zero).
 */
function createBandSeries(
    upperValues: number[],
    lowerValues: number[],
    fillColor: string,
    fillOpacity: number,
    name: string,
    axisIndex: number,
): any {
    return {
        type: "custom",
        name,
        xAxisIndex: axisIndex,
        yAxisIndex: axisIndex,
        // Carry [categoryIndex, lower, upper] so ECharts can derive the y-range
        data: upperValues.map((u, i) => [i, lowerValues[i], u]),
        encode: { x: 0, y: [1, 2] },
        tooltip: { show: false },
        silent: true,
        z: 1,
        renderItem(params: any, api: any) {
            // Only render the full polygon from the first visible data point
            if (params.dataIndexInside !== 0) {
                return { type: "group", children: [] };
            }
            const count: number = params.dataInsideLength ?? 0;
            const startIdx: number = params.dataIndex ?? 0;
            if (count === 0) return { type: "group", children: [] };

            const points: number[][] = [];

            // Upper boundary left → right
            for (let d = 0; d < count; d++) {
                points.push(api.coord([startIdx + d, upperValues[startIdx + d]]));
            }
            // Lower boundary right → left
            for (let d = count - 1; d >= 0; d--) {
                points.push(api.coord([startIdx + d, lowerValues[startIdx + d]]));
            }

            return {
                type: "polygon",
                shape: { points },
                style: { fill: fillColor, opacity: fillOpacity },
            };
        },
    };
}

/** Build the fanchart band series using custom polygons.
 *  When min/max are available, renders an outer min–max band (lighter) around the P10–P90 band.
 */
export function buildFanchartSeries(trace: ChartTrace, selectedStatistics: StatisticsType[], axisIndex = 0): any[] {
    if (!trace.stats) return [];

    const { p10, p90, min, max } = trace.stats;
    const series: any[] = [];

    const hasPercentiles =
        selectedStatistics.includes(StatisticsType.P10) && selectedStatistics.includes(StatisticsType.P90);
    const hasMinMax =
        selectedStatistics.includes(StatisticsType.Min) && selectedStatistics.includes(StatisticsType.Max);

    if (hasMinMax && hasPercentiles) {
        // Full fanchart: three bands min→p10, p10→p90, p90→max
        series.push(
            createBandSeries(p10, min, trace.color, 0.08, `${trace.label} _fan_low`, axisIndex),
            createBandSeries(p90, p10, trace.color, 0.3, `${trace.label} _fan_mid`, axisIndex),
            createBandSeries(max, p90, trace.color, 0.08, `${trace.label} _fan_high`, axisIndex),
        );
    } else if (hasMinMax) {
        series.push(createBandSeries(max, min, trace.color, 0.1, `${trace.label} _fan_band`, axisIndex));
    } else if (hasPercentiles) {
        series.push(createBandSeries(p90, p10, trace.color, 0.3, `${trace.label} _fan_band`, axisIndex));
    }

    return series;
}
