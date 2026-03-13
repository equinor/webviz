import type { CustomSeriesOption, LineSeriesOption } from "echarts/charts";

import type { StatisticKey, TimeseriesTrace } from "../types";

type StatSeriesEntry = {
    key: StatisticKey;
    width: number;
    dash: "solid" | "dashed" | "dotted";
};

const STAT_SERIES_DEFS: StatSeriesEntry[] = [
    { key: "mean", width: 2, dash: "solid" },
    { key: "p50", width: 1.5, dash: "dashed" },
    { key: "p10", width: 1.5, dash: "dashed" },
    { key: "p90", width: 1.5, dash: "dashed" },
    { key: "min", width: 1.5, dash: "dotted" },
    { key: "max", width: 1.5, dash: "dotted" },
];

export function buildStatisticsSeries(
    trace: TimeseriesTrace,
    selectedStatistics: StatisticKey[],
    axisIndex = 0,
): LineSeriesOption[] {
    if (!trace.statistics) return [];

    const series: LineSeriesOption[] = [];

    for (const def of STAT_SERIES_DEFS) {
        if (selectedStatistics.includes(def.key)) {
            series.push({
                id: `${trace.name}_${def.key}_${axisIndex}`,
                name: trace.name,
                type: "line",
                data: trace.statistics[def.key],
                xAxisIndex: axisIndex,
                yAxisIndex: axisIndex,
                itemStyle: { color: trace.color },
                lineStyle: { color: trace.color, width: def.width, type: def.dash },
                symbol: "none",
                emphasis: { disabled: true },
                blur: { lineStyle: { opacity: 1 } },
            });
        }
    }

    return series;
}

/**
 * Custom polygon band between two y-value arrays.
 * Handles negative values correctly (unlike stacked areas).
 */
function createBandSeries(
    upperValues: number[],
    lowerValues: number[],
    fillColor: string,
    fillOpacity: number,
    name: string,
    axisIndex: number,
): CustomSeriesOption {
    return {
        type: "custom",
        name,
        xAxisIndex: axisIndex,
        yAxisIndex: axisIndex,
        data: upperValues.map((u, i) => [i, lowerValues[i], u]),
        encode: { x: 0, y: [1, 2] },
        tooltip: { show: false },
        silent: true,
        z: 1,
        renderItem(params, api) {
            const bandParams = params as typeof params & {
                dataIndexInside?: number;
                dataInsideLength?: number;
                dataIndex?: number;
            };

            if (bandParams.dataIndexInside !== 0) {
                return { type: "group", children: [] };
            }
            const count = bandParams.dataInsideLength ?? 0;
            const startIdx = bandParams.dataIndex ?? 0;
            if (count === 0) return { type: "group", children: [] };

            const points: number[][] = [];

            for (let d = 0; d < count; d++) {
                points.push(api.coord([startIdx + d, upperValues[startIdx + d]]));
            }
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

export function buildFanchartSeries(
    trace: TimeseriesTrace,
    selectedStatistics: StatisticKey[],
    axisIndex = 0,
): CustomSeriesOption[] {
    if (!trace.statistics) return [];

    const { p10, p90, min, max } = trace.statistics;
    const series: CustomSeriesOption[] = [];

    const hasPercentiles = selectedStatistics.includes("p10") && selectedStatistics.includes("p90");
    const hasMinMax = selectedStatistics.includes("min") && selectedStatistics.includes("max");

    if (hasMinMax && hasPercentiles) {
        series.push(
            createBandSeries(p10, min, trace.color, 0.08, `${trace.name} _fan_low`, axisIndex),
            createBandSeries(p90, p10, trace.color, 0.3, `${trace.name} _fan_mid`, axisIndex),
            createBandSeries(max, p90, trace.color, 0.08, `${trace.name} _fan_high`, axisIndex),
        );
    } else if (hasMinMax) {
        series.push(createBandSeries(max, min, trace.color, 0.1, `${trace.name} _fan_band`, axisIndex));
    } else if (hasPercentiles) {
        series.push(createBandSeries(p90, p10, trace.color, 0.3, `${trace.name} _fan_band`, axisIndex));
    }

    return series;
}
