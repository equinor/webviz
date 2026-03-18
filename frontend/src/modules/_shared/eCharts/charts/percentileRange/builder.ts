import type { EChartsOption } from "echarts";

import { buildCartesianSubplotChart } from "../../core/cartesianSubplotChart";
import type { CartesianChartSeries } from "../../core/cartesianSubplotChart";
import type { ContainerSize, DistributionTrace, SubplotGroup } from "../../types";

import { buildPercentileRangeSeries, type PercentileRangeDisplayOptions } from "./series";

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
    const buildSubplot = function buildPercentileRangeSubplotForAxis(
        group: SubplotGroup<DistributionTrace>,
        axisIndex: number,
    ) {
        return buildPercentileRangeSubplot(group, axisIndex, seriesOptions, xAxisLabel, yAxisLabel);
    };

    return buildCartesianSubplotChart(
        subplotGroups,
        buildSubplot,
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

    for (const [traceIndex, trace] of group.traces.entries()) {
        const result = buildPercentileRangeSeries(trace, { ...options, yAxisPosition: traceIndex }, axisIndex);
        series.push(...result.series);

        for (const legendName of result.legendData) {
            if (!seenLegend.has(legendName)) {
                legendData.push(legendName);
                seenLegend.add(legendName);
            }
        }
    }

    return { series, legendData };
}