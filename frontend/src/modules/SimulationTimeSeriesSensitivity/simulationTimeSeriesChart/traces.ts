import { VectorRealizationData_api, VectorStatisticSensitivityData_api } from "@api";
import { StatisticFunction_api } from "@api";

import { PlotData } from "plotly.js";

export interface TimeSeriesPlotlyTrace extends Partial<PlotData> {
    realizationNumber?: number | null;
    legendrank?: number;
}

export function createStatisticalLineTraces(
    sensitivityData: VectorStatisticSensitivityData_api[],
    statisticsFunction: StatisticFunction_api,
    color: string
): TimeSeriesPlotlyTrace[] {
    const traces: TimeSeriesPlotlyTrace[] = [];
    sensitivityData.forEach((aCase, index) => {
        const statisticObj = aCase.value_objects.find((obj) => obj.statistic_function === statisticsFunction);
        if (statisticObj) {
            traces.push(
                createLineTrace({
                    timestampsMsUtc: aCase.timestamps_utc_ms,
                    values: statisticObj.values,
                    name: `${aCase.sensitivity_name}`,
                    legendGroup: `${aCase.sensitivity_name}`,
                    lineShape: "linear",
                    lineDash: "dash",
                    showLegend: index === 0,
                    lineColor: color,
                    lineWidth: 3,
                    hoverTemplate: `Sensitivity:<b>${aCase.sensitivity_name}</b> <br> Case: <b>${aCase.sensitivity_case}</b> <br> Value: %{y} <br> Date: %{x}<extra></extra>`,
                })
            );
        }
    });
    return traces;
}

export function createRealizationLineTraces(
    realizationData: VectorRealizationData_api[],
    sensitivityName: string,
    color: string,
    highlightedRealization?: number | undefined
): TimeSeriesPlotlyTrace[] {
    const traces: TimeSeriesPlotlyTrace[] = [];
    let highlightedTrace: TimeSeriesPlotlyTrace | null = null;
    realizationData.forEach((vec) => {
        const curveColor = highlightedRealization === vec.realization ? "red" : color;
        const lineWidth = highlightedRealization === vec.realization ? 2 : 1;
        const lineShape = highlightedRealization === vec.realization ? "spline" : "linear";
        const isHighlighted = vec.realization === highlightedRealization ? true : false;

        const trace = createLineTrace({
            timestampsMsUtc: vec.timestamps_utc_ms,
            values: vec.values,
            name: `real-${vec.realization}`,
            lineShape: lineShape,
            lineDash: "solid",
            showLegend: false,
            lineColor: curveColor,
            lineWidth: lineWidth,
            hoverTemplate: `Sensitivity:<b>${sensitivityName}</b>  <br> Value: %{y} <br> Date: %{x}<extra></extra>`,
        });

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
export type LineTraceData = {
    timestampsMsUtc: number[];
    values: number[];
    name: string;
    hoverTemplate?: string;
    legendGroup?: string;
    lineShape: "linear" | "spline";
    lineDash: "dash" | "dot" | "dashdot" | "solid";
    showLegend: boolean;
    lineColor: string;
    lineWidth: number;
};
export function createLineTrace(data: LineTraceData): TimeSeriesPlotlyTrace {
    return {
        x: data.timestampsMsUtc,
        y: data.values,
        name: data.name,
        showlegend: data.showLegend,
        hovertemplate: data.hoverTemplate,
        legendgroup: data.legendGroup,
        type: "scatter",
        mode: "lines",
        line: { color: data.lineColor, width: data.lineWidth, dash: data.lineDash, shape: data.lineShape },
    };
}
