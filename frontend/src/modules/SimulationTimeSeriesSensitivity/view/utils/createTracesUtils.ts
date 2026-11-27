import type { PlotData } from "plotly.js";

import type { StatisticFunction_api, VectorRealizationData_api, VectorStatisticSensitivityData_api } from "@api";

// Opacity for dimmed realization traces
const DIMMED_REALIZATION_OPACITY = 0.2;

export interface TimeSeriesPlotlyTrace extends Partial<PlotData> {
    realizationNumber?: number | null;
    legendrank?: number;
}

export function createStatisticalLineTraces(
    sensitivityData: VectorStatisticSensitivityData_api[],
    statisticsFunction: StatisticFunction_api,
    color: string,
): TimeSeriesPlotlyTrace[] {
    const traces: TimeSeriesPlotlyTrace[] = [];
    sensitivityData.forEach((aCase) => {
        const statisticObj = aCase.valueObjects.find((obj) => obj.statisticFunction === statisticsFunction);
        if (statisticObj) {
            traces.push(
                createLineTrace({
                    timestampsMsUtc: aCase.timestampsUtcMs,
                    values: statisticObj.values,
                    name: `${aCase.sensitivityName}`,
                    legendGroup: `${aCase.sensitivityName}`,
                    lineShape: "linear",
                    lineDash: "dash",
                    showLegend: false,
                    lineColor: color,
                    lineWidth: 3,
                    hoverTemplate: `Sensitivity:<b>${aCase.sensitivityName}</b> <br> Case: <b>${aCase.sensitivityCase}</b> <br> Value: %{y} <br> Date: %{x}<extra></extra>`,
                }),
            );
        }
    });
    return traces;
}

export function createRealizationLineTraces(
    realizationData: VectorRealizationData_api[],
    sensitivityName: string,
    color: string,
    highlightedRealization?: number | undefined,
): TimeSeriesPlotlyTrace[] {
    const traces: TimeSeriesPlotlyTrace[] = [];
    let highlightedTrace: TimeSeriesPlotlyTrace | null = null;
    realizationData.forEach((vec) => {
        const lineWidth = highlightedRealization === vec.realization ? 3 : 1;
        const isHighlighted = vec.realization === highlightedRealization ? true : false;

        const trace = createLineTrace({
            timestampsMsUtc: vec.timestampsUtcMs,
            values: vec.values,
            name: `real-${vec.realization}`,
            legendGroup: `${sensitivityName}`,
            lineShape: "linear",
            lineDash: "solid",
            showLegend: false,
            lineColor: color,
            lineWidth: lineWidth,
            opacity: highlightedRealization !== undefined && !isHighlighted ? DIMMED_REALIZATION_OPACITY : undefined,
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
export function createLegendTrace(
    sensitivityName: string,
    color: string,
    lineStyle: "dash" | "solid" = "solid",
): TimeSeriesPlotlyTrace {
    return {
        name: sensitivityName,
        x: [null],
        y: [null],
        legendgroup: sensitivityName,
        showlegend: true,
        type: "scatter",
        mode: "lines",
        line: { color: color, width: 3, dash: lineStyle },
    };
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
    opacity?: number;
};
export function createLineTrace(data: LineTraceData): TimeSeriesPlotlyTrace {
    return {
        x: data.timestampsMsUtc,
        y: data.values,
        name: data.name,
        showlegend: data.showLegend,
        hovertemplate: data.hoverTemplate,
        opacity: data.opacity,
        legendgroup: data.legendGroup,
        type: "scatter",
        mode: "lines",
        line: { color: data.lineColor, width: data.lineWidth, dash: data.lineDash, shape: data.lineShape },
    };
}
