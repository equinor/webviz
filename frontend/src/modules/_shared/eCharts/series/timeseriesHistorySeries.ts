import type { LineSeriesOption } from "echarts/charts";

import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";

import type { SeriesBuildResult } from "../builders/composeChartOption";
import type { HistoricalLineShape, HistoricalTrace } from "../types";
import { makeHistorySeriesId } from "../utils/seriesId";

function mapLineShapeToStep(lineShape: HistoricalLineShape | undefined): "start" | "end" | null {
    if (lineShape === "vh") return "start";
    if (lineShape === "hv") return "end";
    return null;
}

export function buildHistorySeries(trace: HistoricalTrace, axisIndex = 0): SeriesBuildResult {
    const pointCount = Math.min(trace.timestamps.length, trace.values.length);
    if (pointCount === 0) return { series: [], legendData: [] };

    const data: Array<[string, number]> = [];
    for (let i = 0; i < pointCount; i++) {
        data.push([timestampUtcMsToCompactIsoString(trace.timestamps[i]), trace.values[i]]);
    }

    const step = mapLineShapeToStep(trace.lineShape);

    const series: LineSeriesOption[] = [
        {
            id: makeHistorySeriesId(trace.name, axisIndex),
            name: trace.name,
            color: trace.color,
            type: "line",
            data,
            xAxisIndex: axisIndex,
            yAxisIndex: axisIndex,
            symbol: "none",
            showSymbol: false,
            lineStyle: { color: trace.color, width: 1.5 },
            emphasis: { disabled: true },
            blur: { lineStyle: { opacity: 1 } },
            z: 4,
            ...(step ? { step } : {}),
        },
    ];

    return {
        series,
        legendData: [trace.name],
    };
}
