import type { ScatterSeriesOption } from "echarts/charts";

import type { SeriesBuildResult } from "../../../core/composeChartOption";
import type { MemberScatterTrace } from "../../../types";
import { withSeriesMetadata } from "../../../utils/seriesMetadata";

import { makeMemberScatterSeriesId } from "./ids";

export function buildMemberScatterSeries(trace: MemberScatterTrace, axisIndex = 0): SeriesBuildResult {
    const highlightGroupKey = trace.highlightGroupKey ?? trace.name;

    const series: ScatterSeriesOption[] = trace.memberIds.map((memberId, index) =>
        withSeriesMetadata(
            {
                id: makeMemberScatterSeriesId(highlightGroupKey, memberId, axisIndex),
                name: trace.name,
                type: "scatter",
                data: [[trace.xValues[index], trace.yValues[index]]],
                xAxisIndex: axisIndex,
                yAxisIndex: axisIndex,
                itemStyle: { color: trace.color, opacity: 0.4 },
                symbolSize: 12,
                emphasis: {
                    focus: "none",
                    itemStyle: { color: trace.color, opacity: 1, borderColor: trace.color, borderWidth: 2 },
                    symbolSize: 16,
                },
                blur: {
                    itemStyle: { color: trace.color, opacity: 0.15 },
                },
            },
            {
                family: "scatter",
                chart: "memberScatter",
                axisIndex,
                roles: ["member"],
                linkGroupKey: highlightGroupKey,
                memberKey: String(memberId),
            },
        ),
    );

    return { series, legendData: [trace.name] };
}