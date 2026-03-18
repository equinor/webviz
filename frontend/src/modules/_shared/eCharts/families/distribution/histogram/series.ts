import type {
    CallbackDataParams,
    CustomSeriesRenderItem,
    CustomSeriesRenderItemAPI,
    CustomSeriesRenderItemParams,
    CustomSeriesRenderItemReturn,
} from "echarts/types/dist/shared";

import type { ChartSeriesOption, SeriesBuildResult } from "../../../builders/composeChartOption";
import type { DistributionTrace } from "../../../types";
import { HistogramType } from "../../../types";
import { computeHistogramLayout, computeHistogramTraceData } from "../../../utils/histogram";
import type { HistogramBarGeometry } from "../../../utils/histogram";
import { withSeriesMetadata } from "../../../utils/seriesMetadata";

import { makeHistogramSeriesId } from "./ids";
import { createHistogramBarTooltipFormatter, createHistogramRugTooltipFormatter } from "./tooltips";

export interface HistogramDisplayOptions {
    numBins?: number;
    showRealizationPoints?: boolean;
    showPercentageInBar?: boolean;
    color?: string;
    opacity?: number;
    borderColor?: string;
    borderWidth?: number;
}

type HistogramBarRenderItemOptions = {
    color: string;
    opacity: number;
    borderColor: string;
    borderWidth: number;
    showPercentageInBar: boolean;
};

export type HistogramBarsSeriesOptions = Omit<HistogramDisplayOptions, "numBins">;

export function buildHistogramSeries(
    trace: DistributionTrace,
    options: HistogramDisplayOptions = {},
    axisIndex = 0,
): SeriesBuildResult {
    const { numBins = 15, ...seriesOptions } = options;

    if (trace.values.length === 0) return { series: [], legendData: [] };

    const traceData = computeHistogramTraceData([trace], numBins);
    const histogramLayout = computeHistogramLayout(traceData, HistogramType.Overlay);
    const bars = histogramLayout.barsByTrace[0] ?? [];

    return buildHistogramSeriesFromBars(trace, bars, seriesOptions, axisIndex);
}

export function buildHistogramSeriesFromBars(
    trace: DistributionTrace,
    bars: HistogramBarGeometry[],
    options: HistogramBarsSeriesOptions = {},
    axisIndex = 0,
): SeriesBuildResult {
    const {
        showRealizationPoints = false,
        showPercentageInBar = false,
        color = trace.color,
        opacity = 1,
        borderColor = "black",
        borderWidth = 1,
    } = options;

    if (trace.values.length === 0) return { series: [], legendData: [] };

    const series: ChartSeriesOption[] = [];
    const barTooltipFormatter = createHistogramBarTooltipFormatter(trace.name, color);
    const rugTooltipFormatter = createHistogramRugTooltipFormatter(trace.name, color);

    series.push(
        withSeriesMetadata(
            {
                id: makeHistogramSeriesId(trace.name, "bars", axisIndex),
                type: "custom",
                name: trace.name,
                color: color,
                data: bars.map((bar, index) => ({
                    value: [bar.xStart, bar.xEnd, bar.yStart, bar.yEnd],
                    binIndex: index,
                    count: bar.count,
                    percentage: bar.percentage,
                })),
                encode: { x: [0, 1], y: [2, 3] },
                xAxisIndex: axisIndex,
                yAxisIndex: axisIndex,
                renderItem: createHistogramBarRenderItem({
                    color,
                    opacity,
                    borderColor,
                    borderWidth,
                    showPercentageInBar,
                }),
                tooltip: {
                    formatter: (params: CallbackDataParams) => barTooltipFormatter(params),
                },
                z: 2,
            },
            {
                family: "distribution",
                chart: "histogram",
                axisIndex,
                roles: ["primary"],
            },
        ),
    );

    if (showRealizationPoints) {
        series.push(
            withSeriesMetadata(
                {
                    id: makeHistogramSeriesId(trace.name, "rug", axisIndex),
                    type: "scatter",
                    name: trace.name,
                    data: trace.values.map((value, index) => ({
                        value: [value, -2],
                        realizationId: trace.realizationIds?.[index] ?? index,
                    })),
                    xAxisIndex: axisIndex,
                    yAxisIndex: axisIndex,
                    symbol: "rect",
                    symbolSize: [1.5, 10],
                    itemStyle: { color, opacity: 0.6 },
                    tooltip: {
                        formatter: (params: CallbackDataParams) => rugTooltipFormatter(params),
                    },
                    z: 3,
                },
                {
                    family: "distribution",
                    chart: "histogram",
                    axisIndex,
                    roles: ["memberPoints"],
                },
            ),
        );
    }

    return {
        series,
        legendData: series.length > 0 ? [trace.name] : [],
    };
}

function createHistogramBarRenderItem(options: HistogramBarRenderItemOptions): CustomSeriesRenderItem {
    const { color, opacity, borderColor, borderWidth, showPercentageInBar } = options;

    return function renderHistogramBar(
        _params: CustomSeriesRenderItemParams,
        api: CustomSeriesRenderItemAPI,
    ): CustomSeriesRenderItemReturn {
        const startValue = Number(api.value(0));
        const endValue = Number(api.value(1));
        const yStart = Number(api.value(2));
        const yEnd = Number(api.value(3));
        const percentage = yEnd - yStart;

        const bottomLeft = api.coord([startValue, yStart]);
        const topRight = api.coord([endValue, yEnd]);
        const rect = {
            x: bottomLeft[0],
            y: topRight[1],
            width: Math.max(topRight[0] - bottomLeft[0], 1),
            height: Math.max(bottomLeft[1] - topRight[1], 0),
        };

        const children: CustomSeriesRenderItemReturn[] = [
            {
                type: "rect" as const,
                shape: rect,
                style: {
                    fill: color,
                    opacity,
                    stroke: borderColor,
                    lineWidth: borderWidth,
                },
            },
        ];

        if (showPercentageInBar && percentage > 0) {
            children.push({
                type: "text" as const,
                style: {
                    text: `${percentage.toFixed(1)}%`,
                    x: rect.x + rect.width / 2,
                    y: rect.y - 4,
                    textAlign: "center",
                    textVerticalAlign: "bottom",
                    fontSize: 10,
                    fill: "#333",
                },
            } as CustomSeriesRenderItemReturn);
        }

        return {
            type: "group" as const,
            children: children as NonNullable<CustomSeriesRenderItemReturn>[],
        };
    };
}