import type { EChartsOption } from "echarts";

import { buildDensitySeries } from "../series/densitySeries";
import type { DensityDisplayOptions } from "../series/densitySeries";
import type { ContainerSize, DistributionTrace, SubplotGroup } from "../types";

import { buildCartesianSubplotChart } from "./cartesianSubplotChartBuilder";
import type { CartesianChartSeries } from "./cartesianSubplotChartBuilder";

export type DensityChartOptions = DensityDisplayOptions & {
    xAxisLabel?: string;
    yAxisLabel?: string;
    sharedXAxis?: boolean;
    sharedYAxis?: boolean;
};

export function buildDensityChart(
    subplotGroups: SubplotGroup<DistributionTrace>[],
    options: DensityChartOptions = {},
    containerSize?: ContainerSize,
): EChartsOption {
    const { xAxisLabel = "Value", yAxisLabel = "Density", sharedXAxis, sharedYAxis, ...seriesOptions } = options;

    return buildCartesianSubplotChart(
        subplotGroups,
        (group, axisIndex) => {
            const { series, legendData } = buildDensitySubplotSeries(group, axisIndex, seriesOptions);

            return {
                series,
                legendData,
                xAxis: { type: "value", scale: true, label: xAxisLabel },
                yAxis: { type: "value", label: yAxisLabel },
                title: group.title,
            };
        },
        { containerSize, sharedXAxis, sharedYAxis },
    );
}

function buildDensitySubplotSeries(
    group: SubplotGroup<DistributionTrace>,
    axisIndex: number,
    options: DensityDisplayOptions,
): { series: CartesianChartSeries[]; legendData: string[] } {
    const series: CartesianChartSeries[] = [];
    const legendData: string[] = [];
    const seenLegend = new Set<string>();

    for (const trace of group.traces) {
        const result = buildDensitySeries(trace, options, axisIndex);
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
