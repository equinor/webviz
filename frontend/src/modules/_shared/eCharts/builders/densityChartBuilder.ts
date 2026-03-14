import type { EChartsOption } from "echarts";

import { buildDensitySeries } from "../series/densitySeries";
import type { DensityDisplayOptions } from "../series/densitySeries";
import type { ContainerSize, DistributionTrace, SubplotGroup } from "../types";

import { assignSeriesToAxis, buildCartesianSubplotChart } from "./cartesianSubplotChartBuilder";
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
        (group, axisIndex) => ({
            series: buildDensitySubplotSeries(group, axisIndex, seriesOptions),
            legendData: group.traces.map((trace) => trace.name),
            xAxis: { type: "value", scale: true, label: xAxisLabel },
            yAxis: { type: "value", label: yAxisLabel },
            title: group.title,
        }),
        { containerSize, sharedXAxis, sharedYAxis },
    );
}

function buildDensitySubplotSeries(
    group: SubplotGroup<DistributionTrace>,
    axisIndex: number,
    options: DensityDisplayOptions,
): CartesianChartSeries[] {
    const series: CartesianChartSeries[] = [];

    for (const trace of group.traces) {
        const result = buildDensitySeries(trace, options, axisIndex);
        series.push(...assignSeriesToAxis(result.series, axisIndex));
    }

    return series;
}
