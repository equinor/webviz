import type { EChartsOption } from "echarts";

import { buildPercentileRangeSeries } from "../series/percentileRangeSeries";
import type { PercentileRangeDisplayOptions } from "../series/percentileRangeSeries";
import type { ContainerSize, DistributionTrace, SubplotGroup } from "../types";

import { assignSeriesToAxis, buildCartesianSubplotChart } from "./cartesianSubplotChartBuilder";
import type { CartesianChartSeries } from "./cartesianSubplotChartBuilder";

export type PercentileRangeChartOptions = PercentileRangeDisplayOptions & {
    xAxisLabel?: string;
    yAxisLabel?: string;
};

export function buildPercentileRangeChart(
    subplotGroups: SubplotGroup<DistributionTrace>[],
    options: PercentileRangeChartOptions = {},
    containerSize?: ContainerSize,
): EChartsOption {
    const { xAxisLabel = "Value", yAxisLabel, ...seriesOptions } = options;

    return buildCartesianSubplotChart(
        subplotGroups,
        (group, axisIndex) => buildPercentileRangeSubplot(group, axisIndex, seriesOptions, xAxisLabel, yAxisLabel),
        containerSize,
    );
}

function buildPercentileRangeSubplot(
    group: SubplotGroup<DistributionTrace>,
    axisIndex: number,
    options: PercentileRangeDisplayOptions,
    xAxisLabel: string,
    yAxisLabel?: string,
) {
    const categories = group.traces.map((trace) => trace.name);

    return {
        series: buildPercentileRangeSubplotSeries(group, axisIndex, options),
        legendData: categories,
        xAxis: { type: "value" as const, label: xAxisLabel, scale: true },
        yAxis: { type: "category" as const, data: categories, ...(yAxisLabel ? { label: yAxisLabel } : {}) },
        title: group.title,
    };
}

function buildPercentileRangeSubplotSeries(
    group: SubplotGroup<DistributionTrace>,
    axisIndex: number,
    options: PercentileRangeDisplayOptions,
): CartesianChartSeries[] {
    const series: CartesianChartSeries[] = [];

    group.traces.forEach((trace, traceIndex) => {
        series.push(
            ...assignSeriesToAxis(
                buildPercentileRangeSeries(trace, { ...options, yAxisPosition: traceIndex }, axisIndex),
                axisIndex,
            ),
        );
    });

    return series;
}
