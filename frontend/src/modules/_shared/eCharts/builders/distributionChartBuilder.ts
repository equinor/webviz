import type { EChartsOption } from "echarts";

import { buildDistributionSeries } from "../series/distributionSeries";
import type { DistributionDisplayOptions } from "../series/distributionSeries";
import type { ContainerSize, DistributionTrace, SubplotGroup } from "../types";

import { assignSeriesToAxis, buildCartesianSubplotChart } from "./cartesianSubplotChartBuilder";
import type { CartesianChartSeries } from "./cartesianSubplotChartBuilder";

export type DistributionChartOptions = DistributionDisplayOptions & {
    xAxisLabel?: string;
    yAxisLabel?: string;
    sharedXAxis?: boolean;
    sharedYAxis?: boolean;
};

export function buildDistributionChart(
    subplotGroups: SubplotGroup<DistributionTrace>[],
    options: DistributionChartOptions = {},
    containerSize?: ContainerSize,
): EChartsOption {
    const { xAxisLabel = "Value", yAxisLabel = "Density", sharedXAxis, sharedYAxis, ...seriesOptions } = options;

    return buildCartesianSubplotChart(
        subplotGroups,
        (group, axisIndex) => ({
            series: buildDistributionSubplotSeries(group, axisIndex, seriesOptions),
            legendData: group.traces.map((trace) => trace.name),
            xAxis: { type: "value", label: xAxisLabel },
            yAxis: { type: "value", label: yAxisLabel },
            title: group.title,
        }),
        { containerSize, sharedXAxis, sharedYAxis },
    );
}

function buildDistributionSubplotSeries(
    group: SubplotGroup<DistributionTrace>,
    axisIndex: number,
    options: DistributionDisplayOptions,
): CartesianChartSeries[] {
    const series: CartesianChartSeries[] = [];

    for (const trace of group.traces) {
        const result = buildDistributionSeries(trace, options, axisIndex);
        series.push(...assignSeriesToAxis(result.series, axisIndex));
    }

    return series;
}
