import type { EChartsOption } from "echarts";

import { formatBarTooltip } from "../interaction/tooltipFormatters";
import { buildBarSeries } from "../series/barSeries";
import type { BuildBarSeriesOptions } from "../series/barSeries";
import type { BarTrace, ContainerSize, SubplotGroup } from "../types";

import { assignSeriesToAxis, buildCartesianSubplotChart } from "./cartesianSubplotChartBuilder";
import type { CartesianChartSeries, CartesianSubplotBuildResult } from "./cartesianSubplotChartBuilder";

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

    return buildCartesianSubplotChart(
        subplotGroups,
        (group, axisIndex) => buildBarSubplot(group, axisIndex, seriesOptions, yAxisLabel),
        { containerSize, sharedXAxis, sharedYAxis, tooltip: { trigger: "axis" as const, formatter: formatBarTooltip } },
    );
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
        const result = buildBarSeries(trace, options);
        if (categoryData.length === 0) categoryData = result.categoryData;
        series.push(...assignSeriesToAxis(result.series, axisIndex));
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
