import type { EChartsOption } from "echarts";

import { aggregateSubplotTraces } from "../../core/aggregateSubplotTraces";
import { buildCartesianSubplotChart } from "../../core/cartesianSubplotChart";
import type { CartesianSubplotBuildResult } from "../../core/cartesianSubplotChart";
import type { BaseChartOptions, MemberScatterTrace, SubplotGroup } from "../../types";

import { buildMemberScatterSeries } from "./series";
import { buildMemberScatterTooltip } from "./tooltips";


export interface MemberScatterChartOptions {
    base?: BaseChartOptions;
    series?: {
        xAxisLabel?: string;
        yAxisLabel?: string;
        memberLabel?: string;
    };
}

export function buildMemberScatterChart(
    subplotGroups: SubplotGroup<MemberScatterTrace>[],
    options: MemberScatterChartOptions = {},
): EChartsOption {

    const baseOptions = options.base ?? {};
    const seriesOptions = options.series ?? {};
    const {
        xAxisLabel = "X",
        yAxisLabel = "Y",
        memberLabel
    } = seriesOptions;

    const buildSubplot = function buildMemberScatterSubplotForAxis(
        group: SubplotGroup<MemberScatterTrace>,
        axisIndex: number,
    ): CartesianSubplotBuildResult {
        const { series, legendData } = aggregateSubplotTraces({
            traces: group.traces,
            axisIndex,
            options: seriesOptions,
            buildFn: buildMemberScatterSeries
        });

        return {
            series,
            legendData,
            xAxis: { type: "value", label: xAxisLabel },
            yAxis: { type: "value", label: yAxisLabel },
            title: group.title,
        };
    };

    return buildCartesianSubplotChart(
        subplotGroups,
        buildSubplot,
        {
            ...baseOptions,
            tooltip: buildMemberScatterTooltip({ memberLabel }),
        },
    );
}