import type { EChartsOption } from "echarts";

import { aggregateSubplotTraces } from "../../core/aggregateSubplotTraces";
import { buildCartesianSubplotChart } from "../../core/cartesianSubplotChart";
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
    let traceIndex = 0;
    const buildPercentileSeriesWithIndex = function buildPercentileSeriesWithIndex(trace: DistributionTrace, idx: number) {
        // Assign the trace's position in the array to the categorical Y-axis position
        const result = buildPercentileRangeSeries(
            trace,
            { ...options, yAxisPosition: traceIndex },
            idx
        );

        traceIndex++;
        return result;
    }
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