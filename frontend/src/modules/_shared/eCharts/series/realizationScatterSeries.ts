import type { ScatterSeriesOption } from "echarts/charts";

import type { SeriesBuildResult } from "../builders/composeChartOption";
import type { RealizationScatterTrace } from "../types";
import { makeRealizationSeriesId } from "../utils/seriesId";
import { withSeriesMetadata } from "../utils/seriesMetadata";

export function buildRealizationScatterSeries(trace: RealizationScatterTrace, axisIndex = 0): SeriesBuildResult {
    const highlightGroupKey = trace.highlightGroupKey ?? trace.name;

    const series: ScatterSeriesOption[] = trace.realizationIds.map((realId, i) =>
        withSeriesMetadata(
            {
                id: makeRealizationSeriesId(highlightGroupKey, realId, axisIndex),
                name: trace.name,
                type: "scatter",
                data: [[trace.xValues[i], trace.yValues[i]]],
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
                memberKey: String(realId),
            },
        ),
    );

    return { series, legendData: [trace.name] };
}
