import type { LineSeriesOption } from "echarts/charts";

import type { ChartTrace } from "../view/atoms/derivedAtoms";

/** Build one line series per realization, with bump-chart hover emphasis. */
export function buildRealizationsSeries(
    trace: ChartTrace,
    axisIndex = 0,
): { series: LineSeriesOption[]; legendEntry: string | null } {
    if (!trace.aggregatedValues) return { series: [], legendEntry: null };

    const series: LineSeriesOption[] = trace.aggregatedValues.map((realValues, r) => ({
        name: r === 0 ? trace.label : `${trace.label}_real_${trace.realizations[r]}`,
        type: "line" as const,
        data: realValues,
        xAxisIndex: axisIndex,
        yAxisIndex: axisIndex,
        itemStyle: { color: trace.color, opacity: 0 },
        lineStyle: { width: 0.8, opacity: 0.4 },
        symbol: "circle" as const,
        symbolSize: 15,
        emphasis: {
            lineStyle: { width: 3, opacity: 1 },
            itemStyle: { opacity: 0 },
        },
        blur: {
            lineStyle: { opacity: 0.08, width: 0.5 },
            itemStyle: { opacity: 0 },
        },
    }));

    return { series, legendEntry: trace.label };
}
