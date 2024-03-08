import { computeQuantile } from "@modules/_shared/statistics";

import { PlotData, Shape } from "plotly.js";

interface HistogramPlotData extends Partial<PlotData> {
    nbinsx: number;
}

export function addHistogramTrace(
    values: number[],
    min: number,
    max: number,
    color: string
): Partial<HistogramPlotData> {
    return {
        x: values,
        type: "histogram",
        histnorm: "percent",
        opacity: 0.7,
        xbins: { start: min, end: max, size: (max - min) / 20 },
        marker: {
            color: color,
            line: { width: 1, color: "black" },
        },
    };
}
export function addStatisticallines(values: number[], color: string): Partial<Shape>[] {
    const meanVal = values.reduce((a, b) => a + b, 0) / values.length;
    const p10Val = computeQuantile(values, 0.1);
    const p90Val = computeQuantile(values, 0.9);

    return [
        addVerticalLine(p10Val, color, "P90"),
        addVerticalLine(meanVal, color, "Mean"),
        addVerticalLine(p90Val, color, "P10"),
    ];
}

export function addVerticalLine(x: number, color: string, text: string): Partial<Shape> {
    return {
        label: {
            textposition: "end",
            textangle: 35,
            font: { size: 14, color: color },
            yanchor: "bottom",
            xanchor: "right",
            text: text,
        },
        type: "line",
        x0: x,
        x1: x,
        y0: 0,
        y1: 0.95,
        xref: "x",
        yref: "paper",
        line: {
            color: color,
            width: 3,
            dash: "dash",
        },
    };
}
