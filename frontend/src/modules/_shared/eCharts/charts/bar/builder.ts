import type { EChartsOption } from "echarts";

import { aggregateSubplotTraces } from "../../core/aggregateSubplotTraces";
import { buildCartesianSubplotChart } from "../../core/cartesianSubplotChart";
import type { CartesianSubplotBuildResult } from "../../core/cartesianSubplotChart";
import type { BarTrace, ContainerSize, SubplotGroup } from "../../types";

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
    const buildSubplot = function buildBarSubplotForAxis(
        group: SubplotGroup<BarTrace>,
        axisIndex: number,
    ): CartesianSubplotBuildResult {
        return buildBarSubplot(group, axisIndex, seriesOptions, yAxisLabel);
    };

    return buildCartesianSubplotChart(
        subplotGroups,
        buildSubplot,
        { containerSize, sharedXAxis, sharedYAxis, tooltip: buildBarTooltip() },
    );
}

function buildBarSubplot(
    group: SubplotGroup<BarTrace>,
    axisIndex: number,
    options: BuildBarSeriesOptions,
    yAxisLabel: string,
): CartesianSubplotBuildResult {

    let categoryData: (string | number)[] = [];

    function buildAndCaptureCategories(trace: BarTrace, idx: number, opts: BuildBarSeriesOptions) {
        const result = buildBarSeries(trace, idx, opts);
        if (categoryData.length === 0) {
            categoryData = result.categoryData;
        }
        return result;
    }
    const { series, legendData } = aggregateSubplotTraces({
        traces: group.traces,
        axisIndex,
        options,
        buildFn: buildAndCaptureCategories
    });



    return {
        series,
        legendData,
        xAxis: { type: "category", data: categoryData },
        yAxis: { type: "value", label: yAxisLabel },
        title: group.title,
    };
}