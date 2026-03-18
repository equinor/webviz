import type { LineSeriesOption } from "echarts/charts";

import type { SeriesBuildResult } from "../builders/composeChartOption";
import type { TimeseriesTrace } from "../types";
import { makeRealizationSeriesId } from "../utils/seriesId";
import { withSeriesMetadata } from "../utils/seriesMetadata";

export function buildRealizationsSeries(trace: TimeseriesTrace, axisIndex = 0): SeriesBuildResult {
    if (!trace.realizationValues) return { series: [], legendData: [] };

    const highlightGroupKey = trace.highlightGroupKey ?? trace.name;

    const series: LineSeriesOption[] = trace.realizationValues.map((realValues, r) => {
        const realId = trace.realizationIds?.[r] ?? r;

        // Potential performance improvements:
        // sampling:"lttb"
        // triggerLineEvent: false
        return withSeriesMetadata(
            {
                id: makeRealizationSeriesId(highlightGroupKey, realId, axisIndex),
                name: trace.name,
                type: "line",
                data: realValues,
                xAxisIndex: axisIndex,
                yAxisIndex: axisIndex,
                triggerLineEvent: true,
                itemStyle: { color: trace.color },
                lineStyle: { color: trace.color, width: 0.8, opacity: 0.4 },
                symbol: "circle",
                symbolSize: 6,
                showSymbol: false,
                emphasis: {
                    focus: "none",
                    lineStyle: { color: trace.color, width: 3, opacity: 1 },
                },
                blur: {
                    lineStyle: { color: trace.color, opacity: 0.5, width: 0.5 },
                },
            },
            {
                family: "timeseries",
                chart: "timeseries",
                axisIndex,
                roles: ["member"],
                linkGroupKey: highlightGroupKey,
                memberKey: String(realId),
            },
        );
    });

    return { series, legendData: [trace.name] };
}
