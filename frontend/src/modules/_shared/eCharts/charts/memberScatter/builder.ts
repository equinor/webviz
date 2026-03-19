import type { EChartsOption } from "echarts";

import { aggregateSubplotTraces } from "../../core/aggregateSubplotTraces";
import { buildCartesianSubplotChart } from "../../core/cartesianSubplotChart";
import type { CartesianSubplotBuildResult } from "../../core/cartesianSubplotChart";
import type { ContainerSize, MemberScatterTrace, SubplotGroup } from "../../types";

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
        const { series, legendData } = aggregateSubplotTraces(
            {
                traces: group.traces,
                axisIndex,
                options,
                buildFn: buildMemberScatterSeries
            }
        );
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
