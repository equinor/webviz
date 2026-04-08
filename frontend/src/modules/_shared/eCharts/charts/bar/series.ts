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
type BarDataValue = number | null;

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
    let yData: BarDataValue[];

    if (categoryOrder) {
        // Align values to the pre-computed category order shared across all traces.
        const valueByCategory = new Map<string | number, number>();
        trace.categories.forEach((cat, i) => valueByCategory.set(cat, trace.values[i]));
        xData = categoryOrder;
        yData = categoryOrder.map(function mapCategoryToAlignedValue(cat) {
            return valueByCategory.has(cat) ? (valueByCategory.get(cat) ?? null) : null;
        });
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
                    formatter: formatBarLabel,
                    fontSize: 11,
                }
                : undefined,
        }

    );

    const numericValues = collectNumericBarValues(yData);
    if (showStatisticalMarkers && numericValues.length > 0 && xData.length > 0) {
        const stats = computePointStatistics(numericValues);
        series.push(createMeanReferenceLine(stats.mean, xData, trace, axisIndex));
    }

    return { series, categoryData: xData, legendData: [trace.name] };
}

function formatBarLabel(params: CallbackDataParams): string {
    const value = extractBarDataValue(params.value);
    return value == null ? "" : formatNumber(value);
}

function collectNumericBarValues(values: BarDataValue[]): number[] {
    return values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
}

function extractBarDataValue(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (Array.isArray(value)) {
        const candidate = value[value.length - 1] ?? value[1] ?? value[0];
        return typeof candidate === "number" && Number.isFinite(candidate) ? candidate : null;
    }

    return null;
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