import type { EChartsOption } from "echarts";
import type {
    CallbackDataParams,
    CustomSeriesOption,
    CustomSeriesRenderItemAPI,
    CustomSeriesRenderItemParams,
    ScatterSeriesOption,
} from "echarts/types/dist/shared";

import { formatHistogramBarTooltip, formatHistogramRugTooltip } from "../interaction/tooltipFormatters";
import type { SubplotAxesResult } from "../layout/subplotAxes";
import type { ContainerSize, DistributionTrace, SubplotGroup } from "../types";
import { HistogramType } from "../types";
import { computeHistogramLayout, computeHistogramTraceData } from "../utils";
import type { HistogramBarGeometry, HistogramTraceData } from "../utils/histogram";

import { buildCartesianSubplotChart } from "./cartesianSubplotChartBuilder";
import type { CartesianSubplotBuildResult } from "./cartesianSubplotChartBuilder";
import type { ChartSeriesOption } from "./composeChartOption";

export type HistogramChartOptions = {
    numBins?: number;
    histogramType?: HistogramType;
    showRealizationPoints?: boolean;
    showPercentageInBar?: boolean;
    borderColor?: string;
    borderWidth?: number;
    sharedXAxis?: boolean;
    sharedYAxis?: boolean;
};

type ResolvedHistogramChartOptions = Required<Omit<HistogramChartOptions, "sharedXAxis" | "sharedYAxis">>;

type HistogramBarValue = [number, number, number, number];

type RugPointValue = [number, number];

type HistogramBarDatum = {
    value: HistogramBarValue;
    count: number;
    percentage: number;
};

export function buildHistogramChart(
    subplotGroups: SubplotGroup<DistributionTrace>[],
    options: HistogramChartOptions = {},
    containerSize?: ContainerSize,
): EChartsOption {
    const { sharedXAxis, sharedYAxis, ...rest } = options;
    const config = resolveHistogramChartOptions(rest);

    // Accumulate per-axis yMax during subplot building for post-process y-extent adjustment
    const yMaxByAxis: number[] = [];

    return buildCartesianSubplotChart(
        subplotGroups,
        (group, axisIndex) => buildHistogramSubplot(group, axisIndex, config, yMaxByAxis),
        {
            containerSize,
            sharedXAxis,
            sharedYAxis,
            postProcessAxes: (axes) => applyYAxisExtents(axes, yMaxByAxis, config.showRealizationPoints),
        },
    );
}

function resolveHistogramChartOptions(
    options: Omit<HistogramChartOptions, "sharedXAxis" | "sharedYAxis">,
): ResolvedHistogramChartOptions {
    return {
        numBins: options.numBins ?? 15,
        histogramType: options.histogramType ?? HistogramType.Overlay,
        showRealizationPoints: options.showRealizationPoints ?? false,
        showPercentageInBar: options.showPercentageInBar ?? false,
        borderColor: options.borderColor ?? "black",
        borderWidth: options.borderWidth ?? 1,
    };
}

function buildHistogramSubplot(
    group: SubplotGroup<DistributionTrace>,
    axisIndex: number,
    config: ResolvedHistogramChartOptions,
    yMaxByAxis: number[],
): CartesianSubplotBuildResult {
    const traceData = computeHistogramTraceData(group.traces, config.numBins);
    const { barsByTrace, yMax } = computeHistogramLayout(traceData, config.histogramType);
    yMaxByAxis[axisIndex] = yMax;

    const series: ChartSeriesOption[] = [];

    traceData.forEach((traceDataEntry, traceIndex) => {
        series.push(
            ...buildTraceSeries(
                traceDataEntry,
                barsByTrace[traceIndex] ?? [],
                axisIndex,
                yMax,
                group.traces.length,
                config,
            ),
        );
    });

    return {
        series,
        legendData: traceData.map((entry) => entry.trace.name),
        xAxis: { type: "value", label: "Value" },
        yAxis: { type: "value", label: "Percentage (%)" },
        title: group.title,
    };
}

function buildTraceSeries(
    traceDataEntry: HistogramTraceData,
    bars: HistogramBarGeometry[],
    axisIndex: number,
    yMax: number,
    traceCount: number,
    config: ResolvedHistogramChartOptions,
): ChartSeriesOption[] {
    const series: ChartSeriesOption[] = [];
    const barOpacity = computeBarOpacity(config, traceCount);

    series.push(createHistogramBarSeries(traceDataEntry, bars, axisIndex, barOpacity, config));

    if (config.showRealizationPoints) {
        series.push(createHistogramRugSeries(traceDataEntry, axisIndex));
    }

    return series;
}

function computeBarOpacity(config: ResolvedHistogramChartOptions, traceCount: number): number {
    if (config.histogramType === HistogramType.Overlay && traceCount > 1) return 0.55;
    return 1;
}

function createHistogramBarSeries(
    traceDataEntry: HistogramTraceData,
    bars: HistogramBarGeometry[],
    axisIndex: number,
    opacity: number,
    config: ResolvedHistogramChartOptions,
): CustomSeriesOption {
    return {
        type: "custom",
        name: traceDataEntry.trace.name,
        itemStyle: { color: traceDataEntry.trace.color, borderColor: traceDataEntry.trace.color },
        data: bars.map(toHistogramBarDatum),
        xAxisIndex: axisIndex,
        yAxisIndex: axisIndex,
        encode: { x: [0, 1], y: [2, 3] },
        z: 2,
        renderItem: createHistogramBarRenderItem(
            traceDataEntry.trace.color,
            opacity,
            config.borderColor,
            config.borderWidth,
            config.showPercentageInBar,
        ),
        tooltip: {
            formatter: (params: CallbackDataParams) =>
                formatHistogramBarTooltip(params, traceDataEntry.trace.name, traceDataEntry.trace.color),
        },
    };
}

function createHistogramRugSeries(traceDataEntry: HistogramTraceData, axisIndex: number): ScatterSeriesOption {
    return {
        type: "scatter",
        name: traceDataEntry.trace.name,
        data: traceDataEntry.trace.values.map((value, valueIndex) => ({
            value: [value, -2] satisfies RugPointValue,
            realizationId: traceDataEntry.trace.realizationIds?.[valueIndex] ?? valueIndex,
        })),
        xAxisIndex: axisIndex,
        yAxisIndex: axisIndex,
        symbol: "rect",
        symbolSize: [1.5, 10],
        itemStyle: { color: traceDataEntry.trace.color, opacity: 0.6 },
        z: 3,
        tooltip: {
            formatter: (params: CallbackDataParams) =>
                formatHistogramRugTooltip(params, traceDataEntry.trace.name, traceDataEntry.trace.color),
        },
    };
}

function applyYAxisExtents(axes: SubplotAxesResult, yMaxByAxis: number[], showRealizationPoints: boolean): void {
    yMaxByAxis.forEach((yMax, axisIndex) => {
        const yAxis = axes.yAxes[axisIndex];
        axes.yAxes[axisIndex] = {
            ...yAxis,
            min: showRealizationPoints ? -4 : 0,
            max: Math.max(yMax * 1.1, 1),
        };
    });
}

function createHistogramBarRenderItem(
    color: string,
    opacity: number,
    borderColor: string,
    borderWidth: number,
    showPercentageInBar: boolean,
): NonNullable<CustomSeriesOption["renderItem"]> {
    return (params: CustomSeriesRenderItemParams, api: CustomSeriesRenderItemAPI) => {
        const xStart = Number(api.value(0));
        const xEnd = Number(api.value(1));
        const yStart = Number(api.value(2));
        const yEnd = Number(api.value(3));

        const bottomLeft = api.coord([xStart, yStart]);
        const topRight = api.coord([xEnd, yEnd]);
        const rect = {
            x: bottomLeft[0],
            y: topRight[1],
            width: Math.max(topRight[0] - bottomLeft[0], 1),
            height: Math.max(bottomLeft[1] - topRight[1], 0),
        };

        const barElement = {
            type: "rect" as const,
            shape: rect,
            style: {
                fill: color,
                opacity,
                stroke: borderColor,
                lineWidth: borderWidth,
            },
        };

        const labelElements =
            showPercentageInBar && yEnd > yStart
                ? [
                      {
                          type: "text" as const,
                          style: {
                              text: `${(yEnd - yStart).toFixed(1)}%`,
                              x: rect.x + rect.width / 2,
                              y: rect.y - 4,
                              textAlign: "center" as const,
                              textVerticalAlign: "bottom" as const,
                              fontSize: 10,
                              fill: "#333",
                          },
                      },
                  ]
                : [];

        return {
            type: "group",
            children: [barElement, ...labelElements],
        };
    };
}

function toHistogramBarDatum(bar: HistogramBarGeometry): HistogramBarDatum {
    return {
        value: [bar.xStart, bar.xEnd, bar.yStart, bar.yEnd],
        count: bar.count,
        percentage: bar.percentage,
    };
}
