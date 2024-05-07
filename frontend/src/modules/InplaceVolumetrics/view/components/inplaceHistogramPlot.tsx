import Plot from "react-plotly.js";

import { InplaceVolGroupedResultValues } from "@modules/InplaceVolumetrics/utils/inplaceVolDataEnsembleSetAccessor";
import { computeQuantile } from "@modules/_shared/statistics";

import { Layout, PlotData, PlotType, Shape } from "plotly.js";
import { R } from "vitest/dist/reporters-qc5Smpt5";

const colorPalette = [
    "#1f77b4", // muted blue
    "#ff7f0e", // safety orange
    "#2ca02c", // cooked asparagus green
    "#d62728", // brick red
    "#9467bd", // muted purple
    "#8c564b", // chestnut brown
    "#e377c2", // raspberry yogurt pink
    "#7f7f7f", // middle gray
    "#bcbd22", // curry yellow-green
    "#17becf", // blue-teal
];

export type InplaceResultValues = {
    groupByName: string;
    colorByName: string;
    groupedValues: InplaceVolGroupedResultValues[];
};
export type InplaceHistogramPlotProps = {
    resultValues: InplaceResultValues;
    width: number;
    height: number;
};
export function InplaceHistogramPlot(props: InplaceHistogramPlotProps): React.ReactElement {
    const numSubplots = props.resultValues.groupedValues.length;
    const numColumns = Math.ceil(Math.sqrt(numSubplots));
    const numRows = Math.ceil(numSubplots / numColumns);

    function generateTraces(): Partial<PlotData>[] {
        const addedLegendNames: Set<string> = new Set();
        const traces: Partial<PlotData>[] = [];
        let subplotIndex = 1;

        props.resultValues.groupedValues.forEach((subPlot) => {
            let colorIndex = 0;

            let minGroupValue = Number.POSITIVE_INFINITY;
            let maxGroupValue = Number.NEGATIVE_INFINITY;
            subPlot.subgroups.forEach((subgroup) => {
                const min = Math.min(...subgroup.resultValues);
                const max = Math.max(...subgroup.resultValues);
                minGroupValue = Math.min(minGroupValue, min);
                maxGroupValue = Math.max(maxGroupValue, max);
            });
            const binSize = (maxGroupValue - minGroupValue) / 20;

            subPlot.subgroups.forEach((subgroup) => {
                const shouldShowLegend = !addedLegendNames.has(subgroup.subgroupName.toString());
                if (shouldShowLegend) {
                    addedLegendNames.add(subgroup.subgroupName.toString());
                }
                const histogramTrace = addHistogramTrace({
                    values: subgroup.resultValues,
                    name: subgroup.subgroupName.toString(),
                    showLegend: shouldShowLegend,
                    xAxisName: `x${subplotIndex}`,
                    yAxisName: `y${subplotIndex}`,
                    bins: {
                        start: minGroupValue,
                        end: maxGroupValue,
                        size: binSize,
                    },
                    color: colorPalette[colorIndex % colorPalette.length],
                });
                traces.push(histogramTrace);

                colorIndex++;
            });

            subplotIndex++;
        });

        return traces;
    }

    function generateLayout(): Layout {
        const layout: any = {
            height: props.height,
            width: props.width,
            showlegend: true,
            margin: { l: 50, r: 0, b: 50, t: 50 },
            grid: { rows: numRows, columns: numColumns, pattern: "independent" },
            annotations: [],
            barmode: "overlay",
        };

        for (let i = 1; i <= props.resultValues.groupedValues.length; i++) {
            const resultGroup = props.resultValues.groupedValues[i - 1];
            layout[`xaxis${i}`] = {
                title: resultGroup.groupName,
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
    const layout = generateLayout();
    return <Plot data={data} layout={layout} config={{ displayModeBar: false }} />;
}

type PlotlyBins = {
    start: number;
    end: number;
    size: number;
};
type HistogramTraceData = {
    values: number[];
    name: string;
    showLegend: boolean;
    xAxisName: string;
    yAxisName: string;
    bins: PlotlyBins;
    color: string;
    histNorm?: "percent" | "probability";
};

export function addHistogramTrace({
    values,
    name,
    showLegend,
    xAxisName,
    yAxisName,
    bins,
    color,
    histNorm,
}: HistogramTraceData): Partial<PlotData> {
    return {
        x: values,
        type: "histogram",
        histnorm: histNorm || "percent",
        opacity: 0.7,
        name: name,
        showlegend: showLegend,
        marker: {
            color: color,
            line: { width: 1, color: "black" },
        },
        xaxis: xAxisName,
        yaxis: yAxisName,
        xbins: bins,
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
