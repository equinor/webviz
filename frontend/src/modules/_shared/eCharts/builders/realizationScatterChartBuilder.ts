import type { EChartsOption } from "echarts";

import { buildRealizationScatterTooltip } from "../interaction/tooltips/distribution";
import { buildRealizationScatterSeries } from "../series/realizationScatterSeries";
import type { ContainerSize, RealizationScatterTrace, SubplotGroup } from "../types";

import { buildCartesianSubplotChart } from "./cartesianSubplotChartBuilder";
import type { CartesianChartSeries, CartesianSubplotBuildResult } from "./cartesianSubplotChartBuilder";

export type RealizationScatterChartOptions = {
    xAxisLabel?: string;
    yAxisLabel?: string;
    sharedXAxis?: boolean;
    sharedYAxis?: boolean;
};

export function buildRealizationScatterChart(
    subplotGroups: SubplotGroup<RealizationScatterTrace>[],
    options: RealizationScatterChartOptions = {},
    containerSize?: ContainerSize,
): EChartsOption {
    const { xAxisLabel = "X", yAxisLabel = "Y", sharedXAxis, sharedYAxis } = options;
    const buildSubplot = createRealizationScatterSubplotBuilder(xAxisLabel, yAxisLabel);

    return buildCartesianSubplotChart(
        subplotGroups,
        buildSubplot,
        {
            containerSize,
            sharedXAxis,
            sharedYAxis,
            tooltip: buildRealizationScatterTooltip(),
        },
    );
}

function createRealizationScatterSubplotBuilder(
    xAxisLabel: string,
    yAxisLabel: string,
): (group: SubplotGroup<RealizationScatterTrace>, axisIndex: number) => CartesianSubplotBuildResult {
    return function buildRealizationScatterSubplotForAxis(group, axisIndex): CartesianSubplotBuildResult {
        const { series, legendData } = buildRealizationScatterSubplotSeries(group, axisIndex);

        return {
            series,
            legendData,
            xAxis: { type: "value", label: xAxisLabel },
            yAxis: { type: "value", label: yAxisLabel },
            title: group.title,
        };
    };
}

function buildRealizationScatterSubplotSeries(
    group: SubplotGroup<RealizationScatterTrace>,
    axisIndex: number,
): { series: CartesianChartSeries[]; legendData: string[] } {
    const series: CartesianChartSeries[] = [];
    const legendData: string[] = [];
    const seenLegend = new Set<string>();

    for (const trace of group.traces) {
        const result = buildRealizationScatterSeries(trace, axisIndex);
        series.push(...result.series);
        for (const name of result.legendData) {
            if (!seenLegend.has(name)) {
                legendData.push(name);
                seenLegend.add(name);
            }
        }
    }

    return { series, legendData };
}
