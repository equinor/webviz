import type { EChartsOption } from "echarts";

import { buildCartesianSubplotChart } from "../../../core/cartesianSubplotChart";
import type { CartesianSubplotBuildResult } from "../../../core/cartesianSubplotChart";
import type { ChartSeriesOption } from "../../../core/composeChartOption";
import type { SubplotAxesResult } from "../../../layout/subplotAxes";
import type { ContainerSize, DistributionTrace, SubplotGroup } from "../../../types";
import { HistogramType } from "../../../types";
import { computeHistogramLayout, computeHistogramTraceData } from "../../../utils";
import type { HistogramBarGeometry, HistogramTraceData } from "../../../utils/histogram";

import { buildHistogramSeriesFromBars } from "./series";

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

export function buildHistogramChart(
    subplotGroups: SubplotGroup<DistributionTrace>[],
    options: HistogramChartOptions = {},
    containerSize?: ContainerSize,
): EChartsOption {
    const { sharedXAxis, sharedYAxis, ...rest } = options;
    const config = resolveHistogramChartOptions(rest);

    const yMaxByAxis: number[] = [];
    const buildSubplot = function buildHistogramSubplotForAxis(
        group: SubplotGroup<DistributionTrace>,
        axisIndex: number,
    ): CartesianSubplotBuildResult {
        return buildHistogramSubplot(group, axisIndex, config, yMaxByAxis);
    };
    const postProcessAxes = function postProcessHistogramAxes(axes: SubplotAxesResult): void {
        applyYAxisExtents(axes, yMaxByAxis, config.showRealizationPoints);
    };

    return buildCartesianSubplotChart(
        subplotGroups,
        buildSubplot,
        {
            containerSize,
            sharedXAxis,
            sharedYAxis,
            postProcessAxes,
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

    for (const [traceIndex, traceDataEntry] of traceData.entries()) {
        series.push(
            ...buildTraceSeries(traceDataEntry, barsByTrace[traceIndex] ?? [], axisIndex, group.traces.length, config),
        );
    }

    return {
        series,
        legendData: traceData.map((entry) => entry.trace.name),
        xAxis: { type: "value", label: "Value", scale: true },
        yAxis: { type: "value", label: "Percentage (%)" },
        title: group.title,
    };
}

function buildTraceSeries(
    traceDataEntry: HistogramTraceData,
    bars: HistogramBarGeometry[],
    axisIndex: number,
    traceCount: number,
    config: ResolvedHistogramChartOptions,
): ChartSeriesOption[] {
    const barOpacity = computeBarOpacity(config, traceCount);

    const result = buildHistogramSeriesFromBars(
        traceDataEntry.trace,
        bars,
        {
            showRealizationPoints: config.showRealizationPoints,
            showPercentageInBar: config.showPercentageInBar,
            color: traceDataEntry.trace.color,
            opacity: barOpacity,
            borderColor: config.borderColor,
            borderWidth: config.borderWidth,
        },
        axisIndex,
    );

    return result.series;
}

function computeBarOpacity(config: ResolvedHistogramChartOptions, traceCount: number): number {
    if (config.histogramType === HistogramType.Overlay && traceCount > 1) return 0.55;
    return 1;
}

function applyYAxisExtents(axes: SubplotAxesResult, yMaxByAxis: number[], showRealizationPoints: boolean): void {
    for (const [axisIndex, yMax] of yMaxByAxis.entries()) {
        const yAxis = axes.yAxes[axisIndex];
        axes.yAxes[axisIndex] = {
            ...yAxis,
            min: showRealizationPoints ? -4 : 0,
            max: Math.max(yMax * 1.1, 1),
        };
    }
}