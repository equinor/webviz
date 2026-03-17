import type { EChartsOption } from "echarts";

import { buildExceedanceTooltip } from "../interaction/tooltips/distribution";
import type { SubplotAxesResult } from "../layout/subplotAxes";
import { buildExceedanceSeries } from "../series/exceedanceSeries";
import type { ContainerSize, DistributionTrace, SubplotGroup } from "../types";

import { buildCartesianSubplotChart } from "./cartesianSubplotChartBuilder";
import type { CartesianChartSeries, CartesianSubplotBuildResult } from "./cartesianSubplotChartBuilder";

export type ExceedanceChartOptions = {
    xAxisLabel?: string;
    yAxisLabel?: string;
    sharedXAxis?: boolean;
    sharedYAxis?: boolean;
};

export function buildExceedanceChart(
    subplotGroups: SubplotGroup<DistributionTrace>[],
    options: ExceedanceChartOptions = {},
    containerSize?: ContainerSize,
): EChartsOption {
    const { xAxisLabel = "Value", yAxisLabel = "Exceedance (%)", sharedXAxis, sharedYAxis } = options;
    const buildSubplot = createExceedanceSubplotBuilder(xAxisLabel, yAxisLabel);

    return buildCartesianSubplotChart(
        subplotGroups,
        buildSubplot,
        {
            containerSize,
            sharedXAxis,
            sharedYAxis,
            postProcessAxes: constrainExceedanceYAxis,
            tooltip: buildExceedanceTooltip(),
        },
    );
}

function createExceedanceSubplotBuilder(
    xAxisLabel: string,
    yAxisLabel: string,
): (group: SubplotGroup<DistributionTrace>, axisIndex: number) => CartesianSubplotBuildResult {
    return function buildExceedanceSubplotForAxis(group, axisIndex): CartesianSubplotBuildResult {
        const { series, legendData } = buildExceedanceSubplotSeries(group, axisIndex);

        return {
            series,
            legendData,
            xAxis: { type: "value", scale: true, label: xAxisLabel },
            yAxis: { type: "value", label: yAxisLabel },
            title: group.title,
        };
    };
}

function buildExceedanceSubplotSeries(
    group: SubplotGroup<DistributionTrace>,
    axisIndex: number,
): { series: CartesianChartSeries[]; legendData: string[] } {
    const series: CartesianChartSeries[] = [];
    const legendData: string[] = [];
    const seenLegend = new Set<string>();

    for (const trace of group.traces) {
        const result = buildExceedanceSeries(trace, axisIndex);
        series.push(...result.series);

        for (const legendName of result.legendData) {
            if (!seenLegend.has(legendName)) {
                legendData.push(legendName);
                seenLegend.add(legendName);
            }
        }
    }

    return { series, legendData };
}

function constrainExceedanceYAxis(axes: SubplotAxesResult): void {
    for (let index = 0; index < axes.yAxes.length; index++) {
        axes.yAxes[index] = {
            ...axes.yAxes[index],
            min: 0,
            max: 100,
        };
    }
}
