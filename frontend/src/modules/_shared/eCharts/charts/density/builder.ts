import type { EChartsOption } from "echarts";

import { aggregateSubplotTraces } from "../../core/aggregateSubplotTraces";
import { buildCartesianSubplotChart } from "../../core/cartesianSubplotChart";
import type { CartesianSubplotBuildResult } from "../../core/cartesianSubplotChart";
import type { ContainerSize, DistributionTrace, SubplotGroup } from "../../types";

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
    const { xAxisLabel = "Value", yAxisLabel = "Density", sharedXAxis, sharedYAxis } = options;
    const buildSubplot = function buildDensitySubplotForAxis(
        group: SubplotGroup<DistributionTrace>,
        axisIndex: number,
    ): CartesianSubplotBuildResult {
        const { series, legendData } = aggregateSubplotTraces(
            {
                traces: group.traces,
                axisIndex,
                options,
                buildFn: buildDensitySeries
            }
        );

        return {
            series,
            legendData,
            xAxis: { type: "value", scale: true, label: xAxisLabel },
            yAxis: { type: "value", label: yAxisLabel },
            title: group.title,
        };
    };

    return buildCartesianSubplotChart(
        subplotGroups,
        buildSubplot,
        { containerSize, sharedXAxis, sharedYAxis },
    );
}

