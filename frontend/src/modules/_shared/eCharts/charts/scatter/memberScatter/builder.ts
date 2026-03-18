import type { EChartsOption } from "echarts";

import { buildCartesianSubplotChart } from "../../../core/cartesianSubplotChart";
import type { CartesianChartSeries, CartesianSubplotBuildResult } from "../../../core/cartesianSubplotChart";
import type { ContainerSize, MemberScatterTrace, SubplotGroup } from "../../../types";

import { buildMemberScatterSeries } from "./series";
import { buildMemberScatterTooltip } from "./tooltips";

export type MemberScatterChartOptions = {
    xAxisLabel?: string;
    yAxisLabel?: string;
    memberLabel?: string;
    sharedXAxis?: boolean;
    sharedYAxis?: boolean;
};

export function buildMemberScatterChart(
    subplotGroups: SubplotGroup<MemberScatterTrace>[],
    options: MemberScatterChartOptions = {},
    containerSize?: ContainerSize,
): EChartsOption {
    const { xAxisLabel = "X", yAxisLabel = "Y", memberLabel, sharedXAxis, sharedYAxis } = options;
    const buildSubplot = function buildMemberScatterSubplotForAxis(
        group: SubplotGroup<MemberScatterTrace>,
        axisIndex: number,
    ): CartesianSubplotBuildResult {
        const { series, legendData } = buildMemberScatterSubplotSeries(group, axisIndex);

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
            containerSize,
            sharedXAxis,
            sharedYAxis,
            tooltip: buildMemberScatterTooltip({ memberLabel }),
        },
    );
}

function buildMemberScatterSubplotSeries(
    group: SubplotGroup<MemberScatterTrace>,
    axisIndex: number,
): { series: CartesianChartSeries[]; legendData: string[] } {
    const series: CartesianChartSeries[] = [];
    const legendData: string[] = [];
    const seenLegend = new Set<string>();

    for (const trace of group.traces) {
        const result = buildMemberScatterSeries(trace, axisIndex);
        series.push(...result.series);

        for (const name of result.legendData) {
            if (!seenLegend.has(name)) {
                legendData.push(name);
                seenLegend.add(name);
            }
        }
    }

    return { series, legendData };
}