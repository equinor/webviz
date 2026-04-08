import type { EChartsOption } from "echarts";

import { buildCartesianSubplotChart } from "../../core/cartesianSubplotChart";
import type { CartesianSubplotBuildResult } from "../../core/cartesianSubplotChart";
import type { BarTrace, BaseChartOptions, SubplotGroup } from "../../types";

import { buildBarSeries, type BarSortBy, type BuildBarSeriesOptions } from "./series";
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
 * Computes a unified category order across all traces in the subplot,
 * then builds all traces aligned to that order. Missing categories render
 * as gaps instead of zero-height bars.
 */
function buildBarSubplot(
    group: SubplotGroup<BarTrace>,
    axisIndex: number,
    options: BuildBarSeriesOptions,
    yAxisLabel: string,
): CartesianSubplotBuildResult {
    if (group.traces.length === 0) {
        return { series: [], legendData: [], xAxis: { type: "category", data: [] }, yAxis: { type: "value", label: yAxisLabel } };
    }

    const categoryOrder = computeCategoryOrder(group.traces, options.sortBy ?? "categories");
    const optionsWithOrder: BuildBarSeriesOptions = { ...options, categoryOrder };
    const series = [];
    const legendData: string[] = [];
    const seenLegend = new Set<string>();

    for (const trace of group.traces) {
        const result = buildBarSeries(trace, axisIndex, optionsWithOrder);
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

function computeCategoryOrder(traces: BarTrace[], sortBy: BarSortBy): Array<string | number> {
    const categoryStats = new Map<string | number, { total: number; firstIndex: number }>();
    let nextIndex = 0;

    for (const trace of traces) {
        trace.categories.forEach(function collectCategoryStats(category, index) {
            const value = trace.values[index];
            const existing = categoryStats.get(category);

            if (existing) {
                if (Number.isFinite(value)) {
                    existing.total += value;
                }
                return;
            }

            categoryStats.set(category, {
                total: Number.isFinite(value) ? value : 0,
                firstIndex: nextIndex,
            });
            nextIndex += 1;
        });
    }

    return [...categoryStats.entries()]
        .sort(function sortCategories([leftCategory, leftStats], [rightCategory, rightStats]) {
            if (sortBy === "values") {
                if (rightStats.total !== leftStats.total) {
                    return rightStats.total - leftStats.total;
                }
                return leftStats.firstIndex - rightStats.firstIndex;
            }

            return String(leftCategory).localeCompare(String(rightCategory));
        })
        .map(function pluckCategory([category]) {
            return category;
        });
}