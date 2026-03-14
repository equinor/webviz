import type { EChartsOption } from "echarts";

import { formatConvergenceTooltip } from "../interaction/tooltipFormatters";
import { buildConvergenceSeries } from "../series/convergenceSeries";
import type { ContainerSize, DistributionTrace, SubplotGroup } from "../types";

import { assignSeriesToAxis, buildCartesianSubplotChart } from "./cartesianSubplotChartBuilder";
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
        (group, axisIndex) => ({
            series: buildConvergenceSubplotSeries(group, axisIndex),
            legendData: group.traces.map((trace) => trace.name),
            xAxis: { type: "value", label: xAxisLabel },
            yAxis: { type: "value", scale: true, label: yAxisLabel },
            title: group.title,
        }),
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

function buildConvergenceSubplotSeries(
    group: SubplotGroup<DistributionTrace>,
    axisIndex: number,
): CartesianChartSeries[] {
    const series: CartesianChartSeries[] = [];

    for (const trace of group.traces) {
        series.push(...assignSeriesToAxis(buildConvergenceSeries(trace, axisIndex), axisIndex));
    }

    return series;
}
