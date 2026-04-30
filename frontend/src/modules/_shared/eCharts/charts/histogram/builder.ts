import type { EChartsOption } from "echarts";

import { buildCartesianSubplotChart } from "../../core/cartesianSubplotChart";
import type { CartesianSubplotBuildResult } from "../../core/cartesianSubplotChart";
import type { ChartSeriesOption } from "../../core/composeChartOption";
import type { SubplotAxesResult } from "../../layout/subplotAxes";
import type { BaseChartOptions, DistributionTrace, SubplotGroup } from "../../types";
import { HistogramType } from "../../types";
import { computeHistogramLayout, computeHistogramTraceData } from "../../utils";
import type { HistogramBarGeometry, HistogramTraceData } from "../../utils/histogram";

import { buildHistogramSeriesFromBars } from "./series";
import { applyYAxisExtents, computeBarOpacity } from "./utils";


export type HistogramChartOptions = BaseChartOptions & {
    numBins?: number;
    histogramType?: HistogramType;
    showMemberPoints?: boolean;
    showPercentageInBar?: boolean;
    showStatisticalMarkers?: boolean;
    showStatisticalLabels?: boolean;
    borderColor?: string;
    borderWidth?: number;
};


type ResolvedHistogramSeriesOptions = Required<Omit<HistogramChartOptions, keyof BaseChartOptions>>;

/** Builds a histogram chart supporting stack, group, overlay, and relative modes. */
export function buildHistogramChart(
    subplotGroups: SubplotGroup<DistributionTrace>[],
    options: HistogramChartOptions = {},
): EChartsOption {

    const config = resolveHistogramSeriesOptions(options);
    const xAxisLabel = options.xAxisLabel ?? "Value";
    const yAxisLabel = options.yAxisLabel ?? "Percentage (%)";

    const yMaxByAxis: number[] = [];

    const buildSubplot = function buildHistogramSubplotForAxis(
        group: SubplotGroup<DistributionTrace>,
        axisIndex: number,
    ): CartesianSubplotBuildResult {
        return buildHistogramSubplot(group, axisIndex, config, yMaxByAxis, xAxisLabel, yAxisLabel);
    };

    const postProcessAxes = function postProcessHistogramAxes(axes: SubplotAxesResult): void {
        applyYAxisExtents(axes, yMaxByAxis);
    };


    return buildCartesianSubplotChart(
        subplotGroups,
        buildSubplot,
        {
            ...options,
            postProcessAxes,
        },
    );
}

function resolveHistogramSeriesOptions(
    options?: HistogramChartOptions,
): ResolvedHistogramSeriesOptions {
    return {
        numBins: options?.numBins ?? 15,
        histogramType: options?.histogramType ?? HistogramType.Overlay,
        showMemberPoints: options?.showMemberPoints ?? false,
        showPercentageInBar: options?.showPercentageInBar ?? false,
        showStatisticalMarkers: options?.showStatisticalMarkers ?? false,
        showStatisticalLabels: options?.showStatisticalLabels ?? false,
        borderColor: options?.borderColor ?? "black",
        borderWidth: options?.borderWidth ?? 1,
    };
}

function buildHistogramSubplot(
    group: SubplotGroup<DistributionTrace>,
    axisIndex: number,
    config: ResolvedHistogramSeriesOptions,
    yMaxByAxis: number[],
    xAxisLabel: string,
    yAxisLabel: string,
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
        xAxis: { type: "value", label: xAxisLabel, scale: true },
        yAxis: { type: "value", label: yAxisLabel },
        title: group.title,
    };
}

function buildTraceSeries(
    traceDataEntry: HistogramTraceData,
    bars: HistogramBarGeometry[],
    axisIndex: number,
    traceCount: number,
    config: ResolvedHistogramSeriesOptions,
): ChartSeriesOption[] {
    const barOpacity = computeBarOpacity(config.histogramType, traceCount);

    const result = buildHistogramSeriesFromBars(
        traceDataEntry.trace,
        bars,
        {
            showMemberPoints: config.showMemberPoints,
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