import type { BarSeriesOption, LineSeriesOption } from "echarts/charts";
import type { CallbackDataParams } from "echarts/types/dist/shared";

import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import type { SeriesBuildResult } from "../../../builders/composeChartOption";
import type { BarTrace } from "../../../types";
import { withSeriesMetadata } from "../../../utils/seriesMetadata";
import { computePointStatistics } from "../../../utils/statistics";

import { makeBarSeriesId } from "./ids";
import { formatBarMeanTooltip } from "./tooltips";

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
    } = options;

    const dataPoints = trace.categories.map((cat, i) => ({ x: cat, y: trace.values[i] }));

    const sorted =
        sortBy === "values"
            ? [...dataPoints].sort((a, b) => b.y - a.y)
            : [...dataPoints].sort((a, b) => String(a.x).localeCompare(String(b.x)));

    const xData = sorted.map((point) => point.x);
    const yData = sorted.map((point) => point.y);
    const showText = showLabels && xData.length <= maxLabelsForText;

    const series: BarChartSeries[] = [];

    series.push(
        withSeriesMetadata(
            {
                id: makeBarSeriesId(trace.name, "bars", axisIndex),
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
                encode: { x: 0, y: 1 },
            },
            {
                family: "categorical",
                chart: "bar",
                axisIndex,
                roles: ["primary"],
            },
        ),
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
    return withSeriesMetadata(
        {
            id: makeBarSeriesId(trace.name, "mean", axisIndex),
            type: "line",
            name: trace.name,
            xAxisIndex: axisIndex,
            yAxisIndex: axisIndex,
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
        },
        {
            family: "categorical",
            chart: "bar",
            axisIndex,
            roles: ["reference", "summary"],
            statKey: "mean",
        },
    );
}