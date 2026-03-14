import type { EChartsOption } from "echarts";

import { buildPercentileRangeSeries } from "../series/percentileRangeSeries";
import type { PercentileRangeDisplayOptions } from "../series/percentileRangeSeries";
import type { ContainerSize, DistributionTrace, SubplotGroup } from "../types";

import { buildCartesianSubplotChart } from "./cartesianSubplotChartBuilder";
import type { CartesianChartSeries } from "./cartesianSubplotChartBuilder";

export type PercentileRangeChartOptions = PercentileRangeDisplayOptions & {
    xAxisLabel?: string;
    yAxisLabel?: string;
    sharedXAxis?: boolean;
    sharedYAxis?: boolean;
};

export function buildPercentileRangeChart(
    subplotGroups: SubplotGroup<DistributionTrace>[],
    options: PercentileRangeChartOptions = {},
    containerSize?: ContainerSize,
): EChartsOption {
    const { xAxisLabel = "Value", yAxisLabel, sharedXAxis, sharedYAxis, ...seriesOptions } = options;

    return buildCartesianSubplotChart(
        subplotGroups,
        (group, axisIndex) => buildPercentileRangeSubplot(group, axisIndex, seriesOptions, xAxisLabel, yAxisLabel),
        { containerSize, sharedXAxis, sharedYAxis },
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
    const { series, legendData } = buildPercentileRangeSubplotSeries(group, axisIndex, options);

    return {
        series,
        legendData: legendData.length > 0 ? legendData : categories,
        xAxis: { type: "value" as const, label: xAxisLabel, scale: true },
        yAxis: { type: "category" as const, data: categories, ...(yAxisLabel ? { label: yAxisLabel } : {}) },
        title: group.title,
    };
}

function buildPercentileRangeSubplotSeries(
    group: SubplotGroup<DistributionTrace>,
    axisIndex: number,
    options: PercentileRangeDisplayOptions,
): { series: CartesianChartSeries[]; legendData: string[] } {
    const series: CartesianChartSeries[] = [];
    const legendData: string[] = [];
    const seenLegend = new Set<string>();

    group.traces.forEach((trace, traceIndex) => {
        const result = buildPercentileRangeSeries(trace, { ...options, yAxisPosition: traceIndex }, axisIndex);
        series.push(...result.series);

        for (const legendName of result.legendData) {
            if (!seenLegend.has(legendName)) {
                legendData.push(legendName);
                seenLegend.add(legendName);
            }
        }
    });

    return { series, legendData };
}
