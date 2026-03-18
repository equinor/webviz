import type { EChartsOption } from "echarts";

import { buildCartesianSubplotChart } from "../../../builders/cartesianSubplotChartBuilder";
import type { CartesianChartSeries, CartesianSubplotBuildResult } from "../../../builders/cartesianSubplotChartBuilder";
import type { ContainerSize, DistributionTrace, SubplotGroup } from "../../../types";

import { buildDensitySeries, type DensityDisplayOptions } from "./series";

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
    const buildSubplot = createDensitySubplotBuilder(seriesOptions, xAxisLabel, yAxisLabel);

    return buildCartesianSubplotChart(
        subplotGroups,
        buildSubplot,
        { containerSize, sharedXAxis, sharedYAxis },
    );
}

function createDensitySubplotBuilder(
    seriesOptions: DensityDisplayOptions,
    xAxisLabel: string,
    yAxisLabel: string,
): (group: SubplotGroup<DistributionTrace>, axisIndex: number) => CartesianSubplotBuildResult {
    return function buildDensitySubplotForAxis(group, axisIndex): CartesianSubplotBuildResult {
        const { series, legendData } = buildDensitySubplotSeries(group, axisIndex, seriesOptions);

        return {
            series,
            legendData,
            xAxis: { type: "value", scale: true, label: xAxisLabel },
            yAxis: { type: "value", label: yAxisLabel },
            title: group.title,
        };
    };
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