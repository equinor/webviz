import type { EChartsOption } from "echarts";

import { buildCartesianSubplotChart } from "../../../builders/cartesianSubplotChartBuilder";
import type { CartesianChartSeries, CartesianSubplotBuildResult } from "../../../builders/cartesianSubplotChartBuilder";
import type { ContainerSize, DistributionTrace, SubplotGroup } from "../../../types";

import { buildConvergenceSeries } from "./series";
import { buildConvergenceTooltip } from "./tooltips";

export type ConvergenceChartOptions = {
    xAxisLabel?: string;
    yAxisLabel?: string;
    sharedXAxis?: boolean;
    sharedYAxis?: boolean;
};

export function buildConvergenceChart(
    subplotGroups: SubplotGroup<DistributionTrace>[],
    options: ConvergenceChartOptions = {},
    containerSize?: ContainerSize,
): EChartsOption {
    const { xAxisLabel = "Realizations", yAxisLabel = "Value", sharedXAxis, sharedYAxis } = options;
    const buildSubplot = function buildConvergenceSubplotForAxis(
        group: SubplotGroup<DistributionTrace>,
        axisIndex: number,
    ): CartesianSubplotBuildResult {
        const { series, legendData } = buildConvergenceSubplot(group, axisIndex);

        return {
            series,
            legendData,
            xAxis: { type: "value", label: xAxisLabel },
            yAxis: { type: "value", scale: true, label: yAxisLabel },
            title: group.title,
        };
    };

    return buildCartesianSubplotChart(
        subplotGroups,
        buildSubplot,
        {
            containerSize,
            sharedXAxis,
            sharedYAxis,
            tooltip: buildConvergenceTooltip(),
        },
    );
}

function buildConvergenceSubplot(
    group: SubplotGroup<DistributionTrace>,
    axisIndex: number,
): { series: CartesianChartSeries[]; legendData: string[] } {
    const series: CartesianChartSeries[] = [];
    const legendData: string[] = [];
    const seenLegend = new Set<string>();

    for (const trace of group.traces) {
        const result = buildConvergenceSeries(trace, axisIndex);
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