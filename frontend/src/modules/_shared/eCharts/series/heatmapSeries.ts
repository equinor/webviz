import type { HeatmapTrace } from "../types";

export function buildHeatmapSeries(trace: HeatmapTrace, axisIndex = 0, activeDate?: string | null): any {
    return {
        type: "heatmap",
        xAxisIndex: axisIndex,
        yAxisIndex: axisIndex,
        data: trace.data,
        emphasis: {
            itemStyle: { shadowBlur: 10, shadowColor: "rgba(0, 0, 0, 0.5)" },
        },
        ...(activeDate != null && {
            markLine: {
                silent: true,
                symbol: "none",
                animation: false,
                lineStyle: { type: "solid", color: "#333", width: 1.5 },
                label: {
                    show: true,
                    formatter: activeDate,
                    position: "insideEndTop",
                    fontSize: 10,
                    color: "#333",
                },
                data: [{ xAxis: activeDate }],
            },
        }),
    };
}
