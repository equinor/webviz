import type { EChartsOption } from "echarts";

import { buildCartesianSubplotChart } from "../../core/cartesianSubplotChart";
import type { CartesianSubplotBuildResult } from "../../core/cartesianSubplotChart";
import type { BarTrace, BaseChartOptions, SubplotGroup } from "../../types";

import { buildBarSeries, type BuildBarSeriesOptions } from "./series";
import { buildBarTooltip } from "./tooltips";
export type BarChartOptions = BaseChartOptions & BuildBarSeriesOptions & {
    yAxisLabel?: string;
};

export function buildBarChart(
    subplotGroups: SubplotGroup<BarTrace>[],
    options: BarChartOptions = {},
): EChartsOption {
    const yAxisLabel = options.yAxisLabel ?? "Value";

    const buildSubplot = function buildBarSubplotForAxis(
        group: SubplotGroup<BarTrace>,
        axisIndex: number,
    ): CartesianSubplotBuildResult {
        return buildBarSubplot(group, axisIndex, options, yAxisLabel);
    };

    return buildCartesianSubplotChart(
        subplotGroups,
        buildSubplot,
        {
            ...options,
            tooltip: buildBarTooltip(),
        },
    );
}

/**
 * Computes a unified category order from the first trace in the subplot,
 * then builds all traces aligned to that order. This prevents misalignment
 * when multiple traces share categories but sortBy is "values".
 */
function buildBarSubplot(
    group: SubplotGroup<BarTrace>,
    axisIndex: number,
    options: BuildBarSeriesOptions,
    yAxisLabel: string,
): CartesianSubplotBuildResult {
    const firstTrace = group.traces[0];
    if (!firstTrace) {
        return { series: [], legendData: [], xAxis: { type: "category", data: [] }, yAxis: { type: "value", label: yAxisLabel } };
    }

    // Compute category order once from the first trace.
    const firstResult = buildBarSeries(firstTrace, axisIndex, options);
    const categoryOrder = firstResult.categoryData;

    // Build remaining traces aligned to the shared category order.
    const optionsWithOrder: BuildBarSeriesOptions = { ...options, categoryOrder };
    const series = [...firstResult.series];
    const legendData = [...firstResult.legendData];
    const seenLegend = new Set(legendData);

    for (let i = 1; i < group.traces.length; i++) {
        const result = buildBarSeries(group.traces[i], axisIndex, optionsWithOrder);
        series.push(...result.series);
        for (const name of result.legendData) {
            if (!seenLegend.has(name)) {
                legendData.push(name);
                seenLegend.add(name);
            }
        }
    }

    return {
        series,
        legendData,
        xAxis: { type: "category", data: categoryOrder },
        yAxis: { type: "value", label: yAxisLabel },
        title: group.title,
    };
}