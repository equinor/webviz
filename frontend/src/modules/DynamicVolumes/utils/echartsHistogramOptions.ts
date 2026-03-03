import type { EChartsOption } from "echarts";

import { formatNumber } from "@modules/_shared/utils/numberFormatting";

/** Build an EChartsOption for a histogram bar chart. */
export function buildHistogramOptions(
    histogramData: { binLabel: string; count: number }[],
    color: string,
): EChartsOption {
    if (!histogramData.length) return {};

    return {
        animation: false,
        tooltip: {
            trigger: "item",
            formatter: (p: any) =>
                `<div style="font-size:12px;font-weight:500">${p.name}</div>` +
                `<div>Count: <b>${formatNumber(p.value as number)}</b></div>`,
        },
        grid: { top: 20, right: 60, bottom: 50, left: 60 },
        xAxis: {
            type: "category",
            data: histogramData.map((d) => d.binLabel),
            axisLabel: { fontSize: 10 },
        },
        yAxis: {
            type: "value",
            name: "Count",
            nameLocation: "middle",
            nameGap: 40,
            axisLabel: { fontSize: 11 },
        },
        series: [
            {
                name: "Realizations",
                type: "bar",
                data: histogramData.map((d) => d.count),
                itemStyle: { color },
            },
        ],
        dataZoom: [
            { type: "slider", show: true, xAxisIndex: [0], start: 0, end: 100, bottom: 0, height: 20, filterMode: "none" },
            { type: "slider", show: true, yAxisIndex: [0], start: 0, end: 100, right: 10, width: 20, filterMode: "none" },
            { type: "inside", xAxisIndex: [0], filterMode: "none" },
            { type: "inside", yAxisIndex: [0], filterMode: "none" },
        ],
    };
}
