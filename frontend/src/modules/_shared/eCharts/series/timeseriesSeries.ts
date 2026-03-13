import type { LineSeriesOption } from "echarts/charts";

import type { TimeseriesTrace } from "../types";

export function buildRealizationsSeries(
    trace: TimeseriesTrace,
    axisIndex = 0,
): { series: LineSeriesOption[]; legendEntry: string | null } {
    if (!trace.realizationValues) return { series: [], legendEntry: null };

    const series: LineSeriesOption[] = trace.realizationValues.map((realValues, r) => {
        const realId = trace.realizationIds?.[r] ?? r;
        return {
            id: `${trace.name}_real_${realId}_${axisIndex}`,
            name: `${trace.name}_real_${realId}`,
            type: "line",
            data: realValues,
            xAxisIndex: axisIndex,
            yAxisIndex: axisIndex,
            triggerLineEvent: true,
            itemStyle: { color: trace.color, opacity: 0 },
            lineStyle: { width: 0.8, opacity: 0.4 },
            symbol: "circle",
            symbolSize: 6,
            emphasis: {
                focus: "series",
                itemStyle: { opacity: 0 },
                lineStyle: { width: 3, opacity: 1 },
            },
            blur: {
                itemStyle: { opacity: 0 },
                lineStyle: { opacity: 0.5, width: 0.5 },
            },
        };
    });

    return { series, legendEntry: trace.name };
}
