import type { LineSeriesOption } from "echarts/charts";

import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";

import type { SeriesBuildResult } from "../../core/composeChartOption";
import type { ReferenceLineShape, ReferenceLineTrace } from "../../types";

import { makeTimeseriesReferenceLineSeriesId } from "./ids";

function mapLineShapeToStep(lineShape: ReferenceLineShape | undefined): "start" | "end" | null {
    if (lineShape === "vh") return "start";
    if (lineShape === "hv") return "end";
    return null;
}

export function buildReferenceLineSeries(trace: ReferenceLineTrace, axisIndex = 0): SeriesBuildResult {
    const pointCount = Math.min(trace.timestamps.length, trace.values.length);
    if (pointCount === 0) return { series: [], legendData: [] };

    const data: Array<[string, number]> = [];
    for (let index = 0; index < pointCount; index++) {
        data.push([timestampUtcMsToCompactIsoString(trace.timestamps[index]), trace.values[index]]);
    }

    const step = mapLineShapeToStep(trace.lineShape);

    const series: LineSeriesOption[] = [
        {
            id: makeTimeseriesReferenceLineSeriesId(trace.name, axisIndex),
            name: trace.name,
            type: "line",
            itemStyle: { color: trace.color },
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