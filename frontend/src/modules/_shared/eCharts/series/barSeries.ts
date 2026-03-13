import type { BarSeriesOption, LineSeriesOption } from "echarts/charts";
import type { CallbackDataParams } from "echarts/types/dist/shared";

import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import { formatCompactTooltip } from "../interaction/tooltipFormatters";
import type { BarTrace, PointStatistics } from "../types";
import { computePointStatistics } from "../utils/statistics";

export type BarSortBy = "categories" | "values";

export type BuildBarSeriesOptions = {
    sortBy?: BarSortBy;
    showStatisticalMarkers?: boolean;
    maxLabelsForText?: number;
};

export type BarChartSeries = BarSeriesOption | LineSeriesOption;

export type BuildBarSeriesResult = {
    series: BarChartSeries[];
    categoryData: (string | number)[];
    legendEntry: string;
};

const MAX_LABELS_FOR_BARS = 20;

export function buildBarSeries(trace: BarTrace, options: BuildBarSeriesOptions = {}): BuildBarSeriesResult {
    const { sortBy = "categories", showStatisticalMarkers = false, maxLabelsForText = MAX_LABELS_FOR_BARS } = options;

    const dataPoints = trace.categories.map((cat, i) => ({ x: cat, y: trace.values[i] }));

    const sorted =
        sortBy === "values"
            ? [...dataPoints].sort((a, b) => b.y - a.y)
            : [...dataPoints].sort((a, b) => String(a.x).localeCompare(String(b.x)));

    const xData = sorted.map((p) => p.x);
    const yData = sorted.map((p) => p.y);
    const showText = xData.length <= maxLabelsForText;

    const series: BarChartSeries[] = [];

    const barSeries: BarSeriesOption = {
        name: trace.name,
        type: "bar",
        data: yData,
        itemStyle: { color: trace.color, opacity: 0.8 },
        label: showText
            ? {
                  show: true,
                  position: "inside",
                  formatter: (params: CallbackDataParams) => formatNumber(params.value as number),
                  fontSize: 12,
                  color: "black",
              }
            : undefined,
        encode: { x: 0, y: 1 },
    };

    series.push(barSeries);

    if (showStatisticalMarkers) {
        const stats = computePointStatistics(yData);
        series.push(...createStatMarkerLines(stats, xData, trace));
    }

    return { series, categoryData: xData, legendEntry: trace.name };
}

function createStatMarkerLines(
    stats: PointStatistics,
    xData: (string | number)[],
    trace: BarTrace,
): LineSeriesOption[] {
    const xStart = xData[0];
    const xEnd = xData[xData.length - 1];

    function makeLine(value: number, label: string, dash: "solid" | "dashed"): LineSeriesOption {
        return {
            type: "line",
            name: trace.name,
            data: [
                [xStart, value],
                [xEnd, value],
            ],
            lineStyle: { color: trace.color, width: 3, type: dash },
            symbol: "none",
            silent: true,
            tooltip: {
                formatter: () =>
                    formatCompactTooltip(trace.name, [{ label, value: formatNumber(value), color: trace.color }]),
            },
        };
    }

    return [
        makeLine(stats.p10, "P10", "dashed"),
        makeLine(stats.mean, "Mean", "solid"),
        makeLine(stats.p90, "P90", "dashed"),
    ];
}
