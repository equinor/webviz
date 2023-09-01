import { VectorRealizationData_api } from "@api";

import { PlotData } from "plotly.js";

export interface TimeSeriesPlotlyTrace extends Partial<PlotData> {
    realizationNumber?: number | null;
    legendrank?: number;
}

export function createRealizationLineTraces(
    realizationData: VectorRealizationData_api[],
    highlightedRealization?: number | undefined
): TimeSeriesPlotlyTrace[] {
    const traces: TimeSeriesPlotlyTrace[] = [];
    let highlightedTrace: TimeSeriesPlotlyTrace | null = null;
    realizationData.forEach((vec) => {
        const curveColor = highlightedRealization === vec.realization ? "red" : "grey";
        const lineWidth = highlightedRealization === vec.realization ? 2 : 1;
        const lineShape = highlightedRealization === vec.realization ? "spline" : "linear";
        const isHighlighted = vec.realization === highlightedRealization ? true : false;
        const trace = createSingleRealizationLineTrace(vec, curveColor, lineWidth, lineShape);
        if (isHighlighted) {
            highlightedTrace = trace;
        } else {
            traces.push(trace);
        }
    });
    if (highlightedTrace) {
        traces.push(highlightedTrace);
    }
    return traces;
}

function createSingleRealizationLineTrace(
    vec: VectorRealizationData_api,
    curveColor: string,
    lineWidth: number,
    lineShape: "linear" | "spline"
): TimeSeriesPlotlyTrace {
    return {
        x: vec.timestamps_utc_ms,
        y: vec.values,
        name: `real-${vec.realization}`,
        realizationNumber: vec.realization,
        // legendrank: vec.realization,
        showlegend: false,
        type: "scatter",
        mode: "lines",
        line: { color: curveColor, width: lineWidth, shape: lineShape },
    };
}

export function createSensitivityStatisticsTrace(
    timestampsMsUtc: number[],
    values: number[],
    name: string,
    lineShape: "linear" | "spline",
    lineDash: "dash" | "dot" | "dashdot" | "solid",
    lineColor?: string | null
): TimeSeriesPlotlyTrace {
    return {
        x: timestampsMsUtc,
        y: values,
        name: name,
        legendrank: -1,
        type: "scatter",
        mode: "lines",
        line: { color: lineColor || "lightblue", width: 4, dash: lineDash, shape: lineShape },
    };
}
