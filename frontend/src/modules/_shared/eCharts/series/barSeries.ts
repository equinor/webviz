import type { BarSeriesOption, LineSeriesOption } from "echarts/charts";
import type { CallbackDataParams } from "echarts/types/dist/shared";

import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import type { SeriesBuildResult } from "../builders/composeChartOption";
import { formatCompactTooltip } from "../interaction/tooltipFormatters";
import type { BarTrace } from "../types";
import { computePointStatistics } from "../utils/statistics";

export type BarSortBy = "categories" | "values";

export type BuildBarSeriesOptions = {
    sortBy?: BarSortBy;
    showStatisticalMarkers?: boolean;
    showLabels?: boolean;
    maxLabelsForText?: number;
};

export type BarChartSeries = BarSeriesOption | LineSeriesOption;

export type BuildBarSeriesResult = SeriesBuildResult & {
    categoryData: (string | number)[];
};

const MAX_LABELS_FOR_BARS = 20;

export function buildBarSeries(trace: BarTrace, options: BuildBarSeriesOptions = {}): BuildBarSeriesResult {
    const {
        sortBy = "categories",
        showStatisticalMarkers = false,
        showLabels = false,
        maxLabelsForText = MAX_LABELS_FOR_BARS,
    } = options;

    const dataPoints = trace.categories.map((cat, i) => ({ x: cat, y: trace.values[i] }));

    const sorted =
        sortBy === "values"
            ? [...dataPoints].sort((a, b) => b.y - a.y)
            : [...dataPoints].sort((a, b) => String(a.x).localeCompare(String(b.x)));

    const xData = sorted.map((p) => p.x);
    const yData = sorted.map((p) => p.y);
    const showText = showLabels && xData.length <= maxLabelsForText;

    const series: BarChartSeries[] = [];

    const barSeries: BarSeriesOption = {
        name: trace.name,
        type: "bar",
        data: yData,
        itemStyle: { color: trace.color, opacity: 0.8 },
        label: showText
            ? {
                  show: true,
                  position: "top",
                  formatter: (params: CallbackDataParams) => formatNumber(params.value as number),
                  fontSize: 11,
              }
            : undefined,
        encode: { x: 0, y: 1 },
    };

    series.push(barSeries);

    if (showStatisticalMarkers) {
        const stats = computePointStatistics(yData);
        series.push(createMeanReferenceLine(stats.mean, xData, trace));
    }

    return { series, categoryData: xData, legendData: [trace.name] };
}

function createMeanReferenceLine(mean: number, xData: (string | number)[], trace: BarTrace): LineSeriesOption {
    return {
        type: "line",
        name: trace.name,
        data: [
            [xData[0], mean],
            [xData[xData.length - 1], mean],
        ],
        lineStyle: { color: trace.color, width: 1.5, type: "dashed", opacity: 0.7 },
        symbol: "none",
        silent: true,
        tooltip: {
            formatter: () =>
                formatCompactTooltip(trace.name, [{ label: "Mean", value: formatNumber(mean), color: trace.color }]),
        },
    };
}
