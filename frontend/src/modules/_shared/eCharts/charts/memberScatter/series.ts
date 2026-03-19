import type { ScatterSeriesOption } from "echarts/charts";

import type { SeriesBuildResult } from "../../core/composeChartOption";
import type { MemberScatterTrace } from "../../types";

import { makeMemberScatterSeriesId } from "./ids";

export function buildMemberScatterSeries(trace: MemberScatterTrace, axisIndex = 0): SeriesBuildResult {
    const highlightGroupKey = trace.highlightGroupKey ?? trace.name;

    const series: ScatterSeriesOption[] = trace.memberIds.map((memberId, index) =>
    (
        {
            id: makeMemberScatterSeriesId(highlightGroupKey, memberId, axisIndex),
            name: trace.name,
            type: "scatter",
            data: [{
                value: [trace.xValues[index], trace.yValues[index]],
                memberId: memberId // ECharts will preserve this!
            }],
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
        }
    ),
    );

    return { series, legendData: [trace.name] };
}