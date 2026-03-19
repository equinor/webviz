import type { EChartsOption } from "echarts";

import { aggregateSubplotTraces } from "../../core/aggregateSubplotTraces";
import { buildCartesianSubplotChart } from "../../core/cartesianSubplotChart";
import type { CartesianSubplotBuildResult } from "../../core/cartesianSubplotChart";
import type { SubplotAxesResult } from "../../layout/subplotAxes";
import type { BaseChartOptions, DistributionTrace, SubplotGroup } from "../../types";

import { buildExceedanceSeries } from "./series";
import { buildExceedanceTooltip } from "./tooltips";


export interface ExceedanceChartOptions {
    base?: BaseChartOptions;
    series?: {
        xAxisLabel?: string;
        yAxisLabel?: string;
    };
}

export function buildExceedanceChart(
    subplotGroups: SubplotGroup<DistributionTrace>[],
    options: ExceedanceChartOptions = {},
): EChartsOption {

    const seriesOptions = options.series ?? {};
    const xAxisLabel = seriesOptions.xAxisLabel ?? "Value";
    const yAxisLabel = seriesOptions.yAxisLabel ?? "Exceedance (%)";

    const buildSubplot = function buildExceedanceSubplotForAxis(
        group: SubplotGroup<DistributionTrace>,
        axisIndex: number,
    ): CartesianSubplotBuildResult {

        const { series, legendData } = aggregateSubplotTraces({
            traces: group.traces,
            axisIndex,
            options: seriesOptions,
            buildFn: buildExceedanceSeries
        });

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
        {
            ...(options.base ?? {}),
            postProcessAxes: constrainExceedanceYAxis,
            tooltip: buildExceedanceTooltip(),
        },
    );
}

function constrainExceedanceYAxis(axes: SubplotAxesResult): void {
    for (let index = 0; index < axes.yAxes.length; index++) {
        axes.yAxes[index] = {
            ...axes.yAxes[index],
            min: 0,
            max: 100,
        };
    }
}