import type { EChartsOption } from "echarts";

import { aggregateSubplotTraces } from "../../core/aggregateSubplotTraces";
import { buildCartesianSubplotChart } from "../../core/cartesianSubplotChart";
import type { CartesianSubplotBuildResult } from "../../core/cartesianSubplotChart";
import type { BaseChartOptions, DistributionTrace, SubplotGroup } from "../../types";

import { buildConvergenceSeries } from "./series";
import { buildConvergenceTooltip } from "./tooltips";


export interface ConvergenceChartOptions {
    base?: BaseChartOptions;
    series?: {
        xAxisLabel?: string;
        yAxisLabel?: string;
    };
}

export function buildConvergenceChart(
    subplotGroups: SubplotGroup<DistributionTrace>[],
    options: ConvergenceChartOptions = {},
): EChartsOption {

    const baseOptions = options.base ?? {};
    const seriesOptions = options.series ?? {};

    const {
        xAxisLabel = "Realizations",
        yAxisLabel = "Value"
    } = seriesOptions;

    const buildSubplot = function buildConvergenceSubplotForAxis(
        group: SubplotGroup<DistributionTrace>,
        axisIndex: number,
    ): CartesianSubplotBuildResult {
        const { series, legendData } = aggregateSubplotTraces({
            traces: group.traces,
            axisIndex,
            options: seriesOptions,
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
            ...baseOptions,
            tooltip: buildConvergenceTooltip(),
        },
    );
}