import type { ScatterSeriesOption } from "echarts/charts";

import type { SeriesBuildResult } from "../builders/composeChartOption";
import type { RealizationScatterTrace } from "../types";
import { makeRealizationSeriesId } from "../utils/seriesId";

export function buildRealizationScatterSeries(trace: RealizationScatterTrace, axisIndex = 0): SeriesBuildResult {
    const highlightGroupKey = trace.highlightGroupKey ?? trace.name;

    const series: ScatterSeriesOption[] = trace.realizationIds.map((realId, i) => ({
        id: makeRealizationSeriesId(highlightGroupKey, realId, axisIndex),
        name: trace.name,
        type: "scatter",
        data: [[trace.xValues[i], trace.yValues[i]]],
        xAxisIndex: axisIndex,
        yAxisIndex: axisIndex,
        itemStyle: { color: trace.color, opacity: 0.6 },
        symbolSize: 8,
        emphasis: {
            focus: "none",
            itemStyle: { color: trace.color, opacity: 1, borderColor: "#000", borderWidth: 2 },
            symbolSize: 14,
        },
        blur: {
            itemStyle: { color: trace.color, opacity: 0.15 },
        },
    }));

    return { series, legendData: [trace.name] };
}
