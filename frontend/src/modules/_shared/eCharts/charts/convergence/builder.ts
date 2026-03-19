import type { EChartsOption } from "echarts";

import { aggregateSubplotTraces } from "../../core/aggregateSubplotTraces";
import { buildCartesianSubplotChart } from "../../core/cartesianSubplotChart";
import type { CartesianSubplotBuildResult } from "../../core/cartesianSubplotChart";
import type { ContainerSize, DistributionTrace, SubplotGroup } from "../../types";

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
        const { series, legendData } = aggregateSubplotTraces({
            traces: group.traces,
            axisIndex,
            buildFn: (trace, idx) => buildConvergenceSeries(trace, idx)
        });

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