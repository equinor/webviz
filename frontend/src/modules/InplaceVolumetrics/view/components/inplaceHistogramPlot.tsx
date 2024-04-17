import Plot from "react-plotly.js";

import { computeQuantile } from "@modules/_shared/statistics";

import { Layout, PlotData, PlotType, Shape } from "plotly.js";

import { GroupedInplaceData } from "../view";

export type InplaceHistogramPlotProps = {
    values: (GroupedInplaceData | null)[];

    width: number;
    height: number;
};
export function InplaceHistogramPlot(props: InplaceHistogramPlotProps) {
    const numSubplots = props.values.length;
    const numColumns = Math.ceil(Math.sqrt(numSubplots));
    const numRows = Math.ceil(numSubplots / numColumns);
    const addedLegendNames: Set<string> = new Set();
    const tracesDataArr: Partial<PlotData>[] = [];
    function generateTraces(): any {
        const traces: any = [];

        let subplotIndex = 1;

        props.values.forEach((subPlot) => {
            if (subPlot) {
                const trace = {
                    x: subPlot.values,
                    type: "histogram" as PlotType,
                    name: subPlot.plotLabel,

                    marker: { color: subPlot.traceColor },
                    xaxis: `x${subplotIndex}`,
                    yaxis: `y${subplotIndex}`,
                    showlegend: true,
                };
                traces.push(trace);
            }
            subplotIndex++;
        });

        return traces;
    }

    function generateLayout(): any {
        const layout: any = {
            height: props.height,
            width: props.width,
            showlegend: true,
            margin: { l: 50, r: 0, b: 50, t: 50 },
            grid: { rows: numRows, columns: numColumns, pattern: "independent" },
            annotations: [],
        };

        for (let i = 1; i <= props.values.length; i++) {
            layout[`xaxis${i}`] = {
                title: "",
                mirror: true,
                showline: true,
                linewidth: 1,
                linecolor: "black",
            };
            layout[`yaxis${i}`] = {
                showticklabels: false,
                showgrid: false,
                zeroline: false,
                mirror: true,
                showline: true,
                linewidth: 1,
                linecolor: "black",
            };
            layout.annotations.push({
                text: "",
                showarrow: false,
                x: 0,
                xref: `x${i} domain`,
                y: 1.1,
                yref: `y${i} domain`,
            });
        }

        return layout;
    }
    const data = generateTraces();
    console.log(data);
    const layout = generateLayout();
    return <Plot data={data} layout={layout} config={{ displayModeBar: false }} />;
}

export interface HistogramPlotData extends Partial<PlotData> {
    nbinsx: number;
}

export function addHistogramTrace(values: number[]): Partial<HistogramPlotData> {
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
