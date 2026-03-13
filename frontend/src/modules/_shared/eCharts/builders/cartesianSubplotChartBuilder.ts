import type { EChartsOption } from "echarts";
import type { BarSeriesOption, CustomSeriesOption, LineSeriesOption, ScatterSeriesOption } from "echarts/charts";

import type { AxisDef } from "../layout/subplotAxes";
import { buildSubplotAxes } from "../layout/subplotAxes";
import { computeSubplotGridLayout } from "../layout/subplotGridLayout";
import type { ContainerSize, SubplotGroup } from "../types";

import { composeChartOption } from "./composeChartOption";
import type { ComposeChartConfig } from "./composeChartOption";

export type CartesianChartSeries = BarSeriesOption | CustomSeriesOption | LineSeriesOption | ScatterSeriesOption;

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

type CartesianAxisBoundSeries = CartesianChartSeries & {
    xAxisIndex?: number;
    yAxisIndex?: number;
};

export function buildCartesianSubplotChart<T>(
    subplotGroups: SubplotGroup<T>[],
    buildSubplot: (group: SubplotGroup<T>, axisIndex: number) => CartesianSubplotBuildResult,
    containerSize?: ContainerSize,
    composeOverrides?: CartesianChartComposeOverrides,
): EChartsOption {
    const groups = subplotGroups.filter((group) => group.traces.length > 0);
    if (groups.length === 0) return {};

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
    return composeChartOption(layout, axes, {
        series: allSeries,
        legendData,
        containerSize,
        ...composeOverrides,
    });
}

export function assignSeriesToAxis<T extends CartesianAxisBoundSeries>(series: T[], axisIndex: number): T[] {
    return series.map((seriesOption) => ({
        ...seriesOption,
        xAxisIndex: axisIndex,
        yAxisIndex: axisIndex,
    }));
}
