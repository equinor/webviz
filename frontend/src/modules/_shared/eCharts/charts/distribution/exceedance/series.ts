import type { LineSeriesOption } from "echarts/charts";

import type { SeriesBuildResult } from "../../../core/composeChartOption";
import type { DistributionTrace } from "../../../types";
import { withSeriesMetadata } from "../../../utils/seriesMetadata";

import { makeExceedanceSeriesId } from "./ids";

export function buildExceedanceSeries(trace: DistributionTrace, axisIndex = 0): SeriesBuildResult {
    const sortedValues = trace.values.filter(Number.isFinite).sort((a, b) => a - b);
    if (sortedValues.length === 0) return { series: [], legendData: [] };

    const series: LineSeriesOption[] = [
        withSeriesMetadata(
            {
                id: makeExceedanceSeriesId(trace.name, "curve", axisIndex),
                type: "line",
                name: trace.name,
                xAxisIndex: axisIndex,
                yAxisIndex: axisIndex,
                data: sortedValues.map((value, index) => [value, computeExceedancePercentage(index, sortedValues.length)]),
                itemStyle: { color: trace.color },
                lineStyle: { color: trace.color, width: 1.5 },
                symbol: "none",
                showSymbol: false,
                smooth: false,
            },
            {
                family: "distribution",
                chart: "exceedance",
                axisIndex,
                roles: ["primary"],
            },
        ),
    ];

    return { series, legendData: [trace.name] };
}

function computeExceedancePercentage(index: number, count: number): number {
    if (count <= 1) return 100;

    const denominator = count - 1;
    return ((denominator - index) / denominator) * 100;
}