import type { LineSeriesOption, ScatterSeriesOption } from "echarts/charts";

import type { ChartSeriesOption, SeriesBuildResult } from "../../core/composeChartOption";
import type { DistributionTrace } from "../../types";

import { makeExceedanceSeriesId } from "./ids";

export type ExceedanceDisplayOptions = {
    showMemberPoints?: boolean;
};

export function buildExceedanceSeries(
    trace: DistributionTrace,
    axisIndex = 0,
    options: ExceedanceDisplayOptions = {},
): SeriesBuildResult {
    const { showMemberPoints = false } = options;

    // Build a sort-index map so we can recover the original member identity
    // after sorting values for the exceedance curve.
    const indexed = trace.values
        .map(function indexValue(value, index) {
            return { value, originalIndex: index };
        })
        .filter(function keepFinite(entry) {
            return Number.isFinite(entry.value);
        })
        .sort(function sortAscending(a, b) {
            return a.value - b.value;
        });

    if (indexed.length === 0) return { series: [], legendData: [] };

    const series: ChartSeriesOption[] = [];

    const lineSeries: LineSeriesOption = {
        id: makeExceedanceSeriesId(trace.name, "primary", axisIndex),
        type: "line",
        name: trace.name,
        xAxisIndex: axisIndex,
        yAxisIndex: axisIndex,
        data: indexed.map(function buildLinePoint(entry, i) {
            return [entry.value, computeExceedancePercentage(i, indexed.length)];
        }),
        itemStyle: { color: trace.color },
        lineStyle: { color: trace.color, width: 1.5 },
        symbol: "none",
        showSymbol: false,
        smooth: false,
    };
    series.push(lineSeries);

    if (showMemberPoints) {
        const scatterSeries: ScatterSeriesOption = {
            id: makeExceedanceSeriesId(trace.name, "memberPoints", axisIndex),
            type: "scatter",
            name: `${trace.name} points`,
            xAxisIndex: axisIndex,
            yAxisIndex: axisIndex,
            data: indexed.map(function buildExceedanceMemberPoint(entry, i) {
                const origIndex = entry.originalIndex;
                return {
                    value: [entry.value, computeExceedancePercentage(i, indexed.length)],
                    memberId: trace.memberIds?.[origIndex] ?? origIndex,
                    itemStyle: trace.memberColors?.[origIndex] ? { color: trace.memberColors[origIndex] } : undefined,
                };
            }),
            symbol: "circle",
            symbolSize: 8,
            itemStyle: { color: trace.color, opacity: 0.8, borderColor: "#fff", borderWidth: 1 },
            z: 3,
        };
        series.push(scatterSeries);
    }

    return { series, legendData: [trace.name] };
}

function computeExceedancePercentage(index: number, count: number): number {
    if (count <= 1) return 100;

    const denominator = count - 1;
    return ((denominator - index) / denominator) * 100;
}