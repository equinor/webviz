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


export interface HistogramChartOptions {
    base?: BaseChartOptions;
    series?: {
        numBins?: number;
        histogramType?: HistogramType;
        showRealizationPoints?: boolean;
        showPercentageInBar?: boolean;
        borderColor?: string;
        borderWidth?: number;
    };
}


type ResolvedHistogramSeriesOptions = Required<NonNullable<HistogramChartOptions["series"]>>;

export function buildHistogramChart(
    subplotGroups: SubplotGroup<DistributionTrace>[],
    options: HistogramChartOptions = {},
): EChartsOption {

    const baseOptions = options.base ?? {};
    const config = resolveHistogramSeriesOptions(options.series);

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
            ...baseOptions,
            postProcessAxes,
        },
    );
}

function resolveHistogramSeriesOptions(
    seriesOptions?: HistogramChartOptions["series"],
): ResolvedHistogramSeriesOptions {
    return {
        numBins: seriesOptions?.numBins ?? 15,
        histogramType: seriesOptions?.histogramType ?? HistogramType.Overlay,
        showRealizationPoints: seriesOptions?.showRealizationPoints ?? false,
        showPercentageInBar: seriesOptions?.showPercentageInBar ?? false,
        borderColor: seriesOptions?.borderColor ?? "black",
        borderWidth: seriesOptions?.borderWidth ?? 1,
    };
}

function buildHistogramSubplot(
    group: SubplotGroup<DistributionTrace>,
    axisIndex: number,
    config: ResolvedHistogramSeriesOptions,
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
    config: ResolvedHistogramSeriesOptions,
): ChartSeriesOption[] {
    const barOpacity = computeBarOpacity(config.histogramType, traceCount);

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