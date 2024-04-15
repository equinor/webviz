import Plot from "react-plotly.js";

import { computeQuantile } from "@modules/_shared/statistics";

import { Layout, PlotData, Shape } from "plotly.js";

export type InplaceHistogramPlotProps = {
    values: number[];
    groupBy: string | null;
    colorBy: string | null;
    width: number;
    height: number;
};
export function InplaceHistogramPlot(props: InplaceHistogramPlotProps) {
    const tracesDataArr: Partial<PlotData>[] = [];

    tracesDataArr.push(addHistogramTrace(props.values));
    const shapes: Partial<Shape>[] = props.values.length > 0 ? addStatisticallines(props.values) : [];
    const layout: Partial<Layout> = {
        margin: { t: 0, r: 0, l: 40, b: 40 },
        xaxis: { title: "Realization", range: [Math.min(...props.values), Math.max(...props.values)] },
        shapes: shapes,
        width: props.width,
        height: props.height,
    };
    return <Plot data={tracesDataArr} layout={layout} config={{ scrollZoom: true }} />;
}

export interface HistogramPlotData extends Partial<PlotData> {
    nbinsx: number;
}

function addHistogramTrace(values: number[]): Partial<HistogramPlotData> {
    return {
        x: values,
        type: "histogram",
        histnorm: "percent",
        opacity: 0.7,
        nbinsx: 15,
        marker: {
            color: "green",
            line: { width: 1, color: "black" },
        },
    };
}
function addStatisticallines(values: number[]): Partial<Shape>[] {
    const meanVal = values.reduce((a, b) => a + b, 0) / values.length;
    const p10Val = computeQuantile(values, 0.1);
    const p90Val = computeQuantile(values, 0.9);

    return [
        addVerticalLine(p10Val, "red", "P90"),
        addVerticalLine(meanVal, "red", "Mean"),
        addVerticalLine(p90Val, "red", "P10"),
    ];
}

function addVerticalLine(x: number, color: string, text: string): Partial<Shape> {
    return {
        label: {
            textposition: "end",
            textangle: 35,
            font: { size: 14, color: "red" },
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
