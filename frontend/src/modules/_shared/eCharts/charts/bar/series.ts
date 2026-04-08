import type { BarSeriesOption, LineSeriesOption } from "echarts/charts";
import type { CallbackDataParams } from "echarts/types/dist/shared";

import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import type { SeriesBuildResult } from "../../core/composeChartOption";
import type { BarTrace } from "../../types";
import { computePointStatistics } from "../../utils/statistics";

import { makeBarSeriesId } from "./ids";
import { formatBarMeanTooltip } from "./tooltips";

export type BarSortBy = "categories" | "values";

export type BuildBarSeriesOptions = {
    sortBy?: BarSortBy;
    showStatisticalMarkers?: boolean;
    showLabels?: boolean;
    maxLabelsForText?: number;
    /** When provided, values are aligned to this category order instead of sorting per-trace. */
    categoryOrder?: (string | number)[];
};

export type BarChartSeries = BarSeriesOption | LineSeriesOption;

export type BuildBarSeriesResult = SeriesBuildResult & {
    categoryData: (string | number)[];
};

const MAX_LABELS_FOR_BARS = 20;

export function buildBarSeries(
    trace: BarTrace,
    axisIndex: number,
    options: BuildBarSeriesOptions = {},
): BuildBarSeriesResult {
    const {
        sortBy = "categories",
        showStatisticalMarkers = false,
        showLabels = false,
        maxLabelsForText = MAX_LABELS_FOR_BARS,
        categoryOrder,
    } = options;

    let xData: (string | number)[];
    let yData: number[];

    if (categoryOrder) {
        // Align values to the pre-computed category order shared across all traces.
        const valueByCategory = new Map<string | number, number>();
        trace.categories.forEach((cat, i) => valueByCategory.set(cat, trace.values[i]));
        xData = categoryOrder;
        yData = categoryOrder.map((cat) => valueByCategory.get(cat) ?? 0);
    } else {
        const dataPoints = trace.categories.map((cat, i) => ({ x: cat, y: trace.values[i] }));
        const sorted =
            sortBy === "values"
                ? [...dataPoints].sort((a, b) => b.y - a.y)
                : [...dataPoints].sort((a, b) => String(a.x).localeCompare(String(b.x)));
        xData = sorted.map((point) => point.x);
        yData = sorted.map((point) => point.y);
    }

    const showText = showLabels && xData.length <= maxLabelsForText;

    const series: BarChartSeries[] = [];

    series.push(

        {
            id: makeBarSeriesId(trace.name, "primary", axisIndex),
            name: trace.name,
            type: "bar",
            xAxisIndex: axisIndex,
            yAxisIndex: axisIndex,
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
        }

    );

    if (showStatisticalMarkers && xData.length > 0) {
        const stats = computePointStatistics(yData);
        series.push(createMeanReferenceLine(stats.mean, xData, trace, axisIndex));
    }

    return { series, categoryData: xData, legendData: [trace.name] };
}

function createMeanReferenceLine(
    mean: number,
    xData: (string | number)[],
    trace: BarTrace,
    axisIndex: number,
): LineSeriesOption {
    return (
        {
            id: makeBarSeriesId(trace.name, "reference", axisIndex, "mean"),
            type: "line",
            name: trace.name,
            xAxisIndex: axisIndex,
            yAxisIndex: axisIndex,
            itemStyle: { color: trace.color },
            data: [
                [xData[0], mean],
                [xData[xData.length - 1], mean],
            ],
            lineStyle: { color: trace.color, width: 1.5, type: "dashed", opacity: 0.7 },
            symbol: "none",
            silent: true,
            tooltip: {
                formatter: () => formatBarMeanTooltip(trace.name, mean, trace.color),
            },
        }

    );
}