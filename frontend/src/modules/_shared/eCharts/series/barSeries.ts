import type { BarSeriesOption } from "echarts/charts";

import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import type { BarTrace, PointStatistics } from "../types";
import { computePointStatistics } from "../utils/statistics";

export type BarSortBy = "categories" | "values";

const MAX_LABELS_FOR_BARS = 20;

export function buildBarSeries(
    trace: BarTrace,
    options: {
        sortBy?: BarSortBy;
        showStatisticalMarkers?: boolean;
        maxLabelsForText?: number;
    } = {},
): any[] {
    const { sortBy = "categories", showStatisticalMarkers = false, maxLabelsForText = MAX_LABELS_FOR_BARS } = options;

    const dataPoints = trace.categories.map((cat, i) => ({ x: cat, y: trace.values[i] }));

    const sorted =
        sortBy === "values"
            ? [...dataPoints].sort((a, b) => b.y - a.y)
            : [...dataPoints].sort((a, b) => String(a.x).localeCompare(String(b.x)));

    const xData = sorted.map((p) => p.x);
    const yData = sorted.map((p) => p.y);
    const showText = xData.length <= maxLabelsForText;

    const series: any[] = [];

    const barSeries: BarSeriesOption = {
        name: trace.name,
        type: "bar",
        data: yData,
        itemStyle: { color: trace.color, opacity: 0.8 },
        label: showText
            ? {
                  show: true,
                  position: "inside",
                  formatter: (params: any) => formatNumber(params.value as number),
                  fontSize: 12,
                  color: "black",
              }
            : undefined,
        // Store xData for axis consumption
        encode: { x: 0, y: 1 },
    };
    // Attach category data for builder to use
    (barSeries as any)._categoryData = xData;

    series.push(barSeries);

    if (showStatisticalMarkers) {
        const stats = computePointStatistics(yData);
        series.push(...createStatMarkerLines(stats, xData, trace));
    }

    return series;
}

function createStatMarkerLines(stats: PointStatistics, xData: (string | number)[], trace: BarTrace): any[] {
    const xStart = xData[0];
    const xEnd = xData[xData.length - 1];

    function makeLine(value: number, label: string, dash: string): any {
        return {
            type: "line",
            name: label,
            data: [
                [xStart, value],
                [xEnd, value],
            ],
            lineStyle: { color: trace.color, width: 3, type: dash },
            symbol: "none",
            silent: true,
            tooltip: {
                formatter: () => `<b>${trace.name}</b><br/><b>${label}</b>: ${formatNumber(value)}`,
            },
        };
    }

    return [
        makeLine(stats.p10, "P10", "dashed"),
        makeLine(stats.mean, "Mean", "solid"),
        makeLine(stats.p90, "P90", "dashed"),
    ];
}
