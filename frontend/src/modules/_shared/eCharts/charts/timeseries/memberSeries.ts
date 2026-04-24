import type { LineSeriesOption } from "echarts/charts";

import type { SeriesBuildResult } from "../../core/composeChartOption";
import type { TimeseriesTrace } from "../../types";

import { makeTimeseriesMemberSeriesId } from "./ids";

export function buildMemberSeries(trace: TimeseriesTrace, axisIndex = 0): SeriesBuildResult {
    if (!trace.memberValues) return { series: [], legendData: [] };

    const highlightGroupKey = trace.highlightGroupKey ?? trace.name;

    const series: LineSeriesOption[] = trace.memberValues.map(function buildMemberLineSeries(memberValues, index) {
        const memberId = trace.memberIds?.[index] ?? index;
        const color = trace.memberColors?.[index] ?? trace.color;

        return (
            {
                id: makeTimeseriesMemberSeriesId(highlightGroupKey, memberId, axisIndex),
                name: trace.name,
                type: "line",
                data: memberValues,
                xAxisIndex: axisIndex,
                yAxisIndex: axisIndex,
                itemStyle: { color },
                lineStyle: { color, width: 0.8, opacity: 0.4 },
                symbol: "circle",
                symbolSize: 6,
                showSymbol: false,
                emphasis: {
                    focus: "none",
                    lineStyle: { color, width: 3, opacity: 1 },
                },
                blur: {
                    lineStyle: { color, opacity: 0.5, width: 0.5 },
                },
            }
        );
    });

    return { series, legendData: [trace.name] };
}