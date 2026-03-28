import type { EChartsOption } from "echarts";


import { aggregateSubplotTraces } from "../../core/aggregateSubplotTraces";
import { buildCartesianSubplotChart } from "../../core/cartesianSubplotChart";
import type { CartesianSubplotBuildResult } from "../../core/cartesianSubplotChart";
import type { BarTrace, BaseChartOptions, SubplotGroup } from "../../types";

import { buildBarSeries, type BuildBarSeriesOptions } from "./series";
import { buildBarTooltip } from "./tooltips";
export interface BarChartOptions {
    base?: BaseChartOptions;
    series?: BuildBarSeriesOptions & {
        yAxisLabel?: string;
    };
}
export function buildBarChart(
    subplotGroups: SubplotGroup<BarTrace>[],
    options: BarChartOptions = {},
): EChartsOption {
    const seriesOptions = options.series ?? {};
    const yAxisLabel = seriesOptions.yAxisLabel ?? "Value";

    const buildSubplot = function buildBarSubplotForAxis(
        group: SubplotGroup<BarTrace>,
        axisIndex: number,
    ): CartesianSubplotBuildResult {
        return buildBarSubplot(group, axisIndex, seriesOptions, yAxisLabel);
    };

    return buildCartesianSubplotChart(
        subplotGroups,
        buildSubplot,
        {
            ...options.base,
            tooltip: buildBarTooltip(),
        },
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
        if (categoryData.length === 0) categoryData = result.categoryData;
        return result;
    }

    const { series, legendData } = aggregateSubplotTraces({
        traces: group.traces,
        axisIndex,
        options,
        buildFn: buildAndCaptureCategories,
    });

    return {
        series,
        legendData,
        xAxis: { type: "category", data: categoryData },
        yAxis: { type: "value", label: yAxisLabel },
        title: group.title,
    };
}