import type { EChartsOption } from "echarts";

import { buildCartesianSubplotChart } from "../../../builders/cartesianSubplotChartBuilder";
import type { CartesianChartSeries, CartesianSubplotBuildResult } from "../../../builders/cartesianSubplotChartBuilder";
import type { BarTrace, ContainerSize, SubplotGroup } from "../../../types";

import { buildBarSeries } from "./series";
import type { BuildBarSeriesOptions } from "./series";
import { buildBarTooltip } from "./tooltips";

export type BarChartOptions = BuildBarSeriesOptions & {
    yAxisLabel?: string;
    sharedXAxis?: boolean;
    sharedYAxis?: boolean;
};

export function buildBarChart(
    subplotGroups: SubplotGroup<BarTrace>[],
    options: BarChartOptions = {},
    containerSize?: ContainerSize,
): EChartsOption {
    const { yAxisLabel = "Value", sharedXAxis, sharedYAxis, ...seriesOptions } = options;
    const buildSubplot = createBarSubplotBuilder(seriesOptions, yAxisLabel);

    return buildCartesianSubplotChart(
        subplotGroups,
        buildSubplot,
        { containerSize, sharedXAxis, sharedYAxis, tooltip: buildBarTooltip() },
    );
}

function createBarSubplotBuilder(
    options: BuildBarSeriesOptions,
    yAxisLabel: string,
): (group: SubplotGroup<BarTrace>, axisIndex: number) => CartesianSubplotBuildResult {
    return function buildBarSubplotForAxis(group, axisIndex): CartesianSubplotBuildResult {
        return buildBarSubplot(group, axisIndex, options, yAxisLabel);
    };
}

function buildBarSubplot(
    group: SubplotGroup<BarTrace>,
    axisIndex: number,
    options: BuildBarSeriesOptions,
    yAxisLabel: string,
): CartesianSubplotBuildResult {
    const series: CartesianChartSeries[] = [];
    const legendData: string[] = [];
    let categoryData: (string | number)[] = [];

    for (const trace of group.traces) {
        const result = buildBarSeries(trace, axisIndex, options);
        if (categoryData.length === 0) categoryData = result.categoryData;
        series.push(...result.series);
        legendData.push(...result.legendData);
    }

    return {
        series,
        legendData,
        xAxis: { type: "category", data: categoryData },
        yAxis: { type: "value", label: yAxisLabel },
        title: group.title,
    };
}