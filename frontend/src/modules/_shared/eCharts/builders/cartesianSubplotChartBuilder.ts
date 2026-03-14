import type { EChartsOption } from "echarts";

import type { AxisDef, SubplotAxesResult } from "../layout/subplotAxes";
import { buildSubplotAxes } from "../layout/subplotAxes";
import { computeSubplotGridLayout } from "../layout/subplotGridLayout";
import type { ContainerSize, SubplotGroup } from "../types";

import { composeChartOption } from "./composeChartOption";
import type { ChartSeriesOption, ComposeChartConfig } from "./composeChartOption";

export type CartesianChartSeries = ChartSeriesOption;

export type CartesianSubplotBuildResult = {
    series: CartesianChartSeries[];
    legendData: string[];
    xAxis: AxisDef;
    yAxis: AxisDef;
    title?: string;
};

export type CartesianChartComposeOverrides = Pick<
    ComposeChartConfig,
    "tooltip" | "axisPointer" | "dataZoom" | "visualMap" | "toolbox"
>;

export type CartesianChartOptions = CartesianChartComposeOverrides & {
    containerSize?: ContainerSize;
    sharedXAxis?: boolean;
    sharedYAxis?: boolean;
    postProcessAxes?: (axes: SubplotAxesResult, allSeries: ChartSeriesOption[]) => void;
};

export function buildCartesianSubplotChart<T>(
    subplotGroups: SubplotGroup<T>[],
    buildSubplot: (group: SubplotGroup<T>, axisIndex: number) => CartesianSubplotBuildResult,
    options: CartesianChartOptions = {},
): EChartsOption {
    const groups = subplotGroups.filter((group) => group.traces.length > 0);
    if (groups.length === 0) return {};

    const { containerSize, sharedXAxis, sharedYAxis, postProcessAxes, ...composeOverrides } = options;

    const layout = computeSubplotGridLayout(groups.length);
    const allSeries: CartesianChartSeries[] = [];
    const axisDefs: Array<{ xAxis: AxisDef; yAxis: AxisDef; title?: string }> = [];
    const legendData: string[] = [];
    const seenLegend = new Set<string>();

    groups.forEach((group, axisIndex) => {
        const result = buildSubplot(group, axisIndex);
        allSeries.push(...result.series);
        axisDefs.push({
            xAxis: result.xAxis,
            yAxis: result.yAxis,
            title: result.title ?? group.title,
        });

        for (const legendName of result.legendData) {
            if (!seenLegend.has(legendName)) {
                legendData.push(legendName);
                seenLegend.add(legendName);
            }
        }
    });

    const axes = buildSubplotAxes(layout, axisDefs);

    if (sharedXAxis) linkValueAxes(axes.xAxes);
    if (sharedYAxis) linkValueAxes(axes.yAxes);
    if (postProcessAxes) postProcessAxes(axes, allSeries);

    return composeChartOption(layout, axes, {
        series: allSeries,
        legendData,
        containerSize,
        ...composeOverrides,
    });
}

/**
 * Force all value-type axes in the array to share the same min/max range.
 * Category axes are skipped since they share range via their data array.
 */
function linkValueAxes(axes: SubplotAxesResult["xAxes"]): void {
    const valueAxes = axes.filter((a) => a.type === "value");
    if (valueAxes.length < 2) return;

    // Collect any explicitly-set min/max values across all axes
    let globalMin = Infinity;
    let globalMax = -Infinity;

    for (const axis of valueAxes) {
        if (typeof axis.min === "number") globalMin = Math.min(globalMin, axis.min);
        if (typeof axis.max === "number") globalMax = Math.max(globalMax, axis.max);
    }

    // If no explicit ranges exist, let ECharts compute per-axis then unify via a
    // function that returns "dataMin"/"dataMax" — but ECharts doesn't cross-reference
    // axes. The only reliable way is to set a shared min/max function.
    // We use the special ECharts callback form that will be called with the computed
    // extent from each axis's own data.
    if (!Number.isFinite(globalMin) || !Number.isFinite(globalMax)) {
        // Use ECharts' special "dataMin"/"dataMax" strings — these unify only within
        // a single axis. To truly share across axes we need a two-pass approach:
        // first let ECharts compute, then update. Since we're building options
        // (not running in a live chart), we set functions that will be called at
        // render time and track the global extent.
        const sharedExtent = { min: Infinity, max: -Infinity };

        for (const axis of valueAxes) {
            axis.min = ((value: { min: number; max: number }) => {
                sharedExtent.min = Math.min(sharedExtent.min, value.min);
                return sharedExtent.min;
            }) as unknown as number;
            axis.max = ((value: { min: number; max: number }) => {
                sharedExtent.max = Math.max(sharedExtent.max, value.max);
                return sharedExtent.max;
            }) as unknown as number;
        }
    } else {
        for (const axis of valueAxes) {
            axis.min = globalMin;
            axis.max = globalMax;
        }
    }
}
