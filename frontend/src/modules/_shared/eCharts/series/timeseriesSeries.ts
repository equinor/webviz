import type { LineSeriesOption } from "echarts/charts";

import type { TimeseriesTrace } from "../types";

export function buildRealizationsSeries(
    trace: TimeseriesTrace,
    axisIndex = 0,
): { series: LineSeriesOption[]; legendEntry: string | null } {
    if (!trace.realizationValues) return { series: [], legendEntry: null };

    const highlightGroupKey = trace.highlightGroupKey ?? trace.name;

    const series: LineSeriesOption[] = trace.realizationValues.map((realValues, r) => {
        const realId = trace.realizationIds?.[r] ?? r;
        return {
            id: `${highlightGroupKey}_real_${realId}_${axisIndex}`,
            name: trace.name,
            type: "line",
            data: realValues,
            xAxisIndex: axisIndex,
            yAxisIndex: axisIndex,
            triggerLineEvent: true,
            itemStyle: { color: trace.color },
            lineStyle: { color: trace.color, width: 0.8, opacity: 0.4 },
            symbol: "circle",
            symbolSize: 6,
            showSymbol: false,
            emphasis: {
                focus: "none",
                lineStyle: { color: trace.color, width: 3, opacity: 1 },
            },
            blur: {
                lineStyle: { color: trace.color, opacity: 0.5, width: 0.5 },
            },
        };
    });

    return { series, legendEntry: trace.name };
}
