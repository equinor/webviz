import type { EChartsOption } from "echarts";

import { aggregateSubplotTraces } from "../../core/aggregateSubplotTraces";
import { buildCartesianSubplotChart } from "../../core/cartesianSubplotChart";
import type { CartesianSubplotBuildResult } from "../../core/cartesianSubplotChart";
import type { BaseChartOptions, DistributionTrace, SubplotGroup } from "../../types";

import { buildPercentileRangeSeries, type PercentileRangeDisplayOptions } from "./series";


export interface PercentileRangeChartOptions {
    base?: BaseChartOptions;
    series?: PercentileRangeDisplayOptions & {
        xAxisLabel?: string;
        yAxisLabel?: string;
    };
}

export function buildPercentileRangeChart(
    subplotGroups: SubplotGroup<DistributionTrace>[],
    options: PercentileRangeChartOptions = {},
): EChartsOption {

    const baseOptions = options.base ?? {};
    const seriesOptions = options.series ?? {};

    const { xAxisLabel = "Value", yAxisLabel } = seriesOptions;

    const buildSubplot = function buildPercentileRangeSubplotForAxis(
        group: SubplotGroup<DistributionTrace>,
        axisIndex: number,
    ): CartesianSubplotBuildResult {
        return buildPercentileRangeSubplot(group, axisIndex, seriesOptions, xAxisLabel, yAxisLabel);
    };


    return buildCartesianSubplotChart(
        subplotGroups,
        buildSubplot,
        baseOptions,
    );
}

function buildPercentileRangeSubplot(
    group: SubplotGroup<DistributionTrace>,
    axisIndex: number,
    options: PercentileRangeDisplayOptions,
    xAxisLabel: string,
    yAxisLabel?: string,
): CartesianSubplotBuildResult {
    const categories = group.traces.map((trace) => trace.name);
    let traceIndex = 0;

    const buildPercentileSeriesWithIndex = function buildPercentileSeriesWithIndex(trace: DistributionTrace, idx: number) {

        const result = buildPercentileRangeSeries(
            trace,
            { ...options, yAxisPosition: traceIndex },
            idx
        );

        traceIndex++;
        return result;
    };

    const { series, legendData } = aggregateSubplotTraces({
        traces: group.traces,
        axisIndex,
        options,
        buildFn: buildPercentileSeriesWithIndex
    });

    return {
        series,
        legendData: legendData.length > 0 ? legendData : categories,
        xAxis: { type: "value" as const, label: xAxisLabel, scale: true },
        yAxis: { type: "category" as const, data: categories, ...(yAxisLabel ? { label: yAxisLabel } : {}) },
        title: group.title,
    };
}