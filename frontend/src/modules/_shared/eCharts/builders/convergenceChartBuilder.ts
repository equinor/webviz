import type { EChartsOption } from "echarts";

import { formatConvergenceTooltip } from "../interaction/tooltipFormatters";
import { buildConvergenceSeries } from "../series/convergenceSeries";
import type { ContainerSize, DistributionTrace, SubplotGroup } from "../types";

import { buildCartesianSubplotChart } from "./cartesianSubplotChartBuilder";
import type { CartesianChartSeries } from "./cartesianSubplotChartBuilder";

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

    return buildCartesianSubplotChart(
        subplotGroups,
        (group, axisIndex) => {
            const { series, legendData } = buildConvergenceSubplot(group, axisIndex);

            return {
                series,
                legendData,
                xAxis: { type: "value", label: xAxisLabel },
                yAxis: { type: "value", scale: true, label: yAxisLabel },
                title: group.title,
            };
        },
        {
            containerSize,
            sharedXAxis,
            sharedYAxis,
            tooltip: {
                trigger: "axis" as const,
                axisPointer: { type: "line" as const },
                formatter: formatConvergenceTooltip,
            },
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
