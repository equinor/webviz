import React from "react";
import Plot from "react-plotly.js";

import { ParameterDataArr } from "@modules/ParameterDistributionMatrix/state";

import { PlotType } from "plotly.js";

type ParameterDistributionPlotProps = {
    dataArr: ParameterDataArr[];
    ensembleColors: Map<string, string>;
    width: number;
    height: number;
};

export const ParameterDistributionPlot: React.FC<ParameterDistributionPlotProps> = (props) => {
    const numSubplots = props.dataArr.length;
    const numColumns = Math.ceil(Math.sqrt(numSubplots));
    const numRows = Math.ceil(numSubplots / numColumns);
    const addedLegendNames: Set<string> = new Set();

    function generateTraces(): any {
        const traces: any = [];

        let subplotIndex = 1;

        props.dataArr.forEach((parameterData) => {
            parameterData.ensembleParameterValues.forEach((ensembleValue) => {
                const shouldShowLegend = !addedLegendNames.has(ensembleValue.ensembleDisplayName);
                if (shouldShowLegend) {
                    addedLegendNames.add(ensembleValue.ensembleDisplayName);
                }

                const trace = {
                    x: ensembleValue.values,
                    type: "violin" as PlotType,
                    name: ensembleValue.ensembleDisplayName,

                    marker: { color: props.ensembleColors.get(ensembleValue.ensembleDisplayName) },
                    xaxis: `x${subplotIndex}`,
                    yaxis: `y${subplotIndex}`,
                    showlegend: shouldShowLegend,
                    y0: 0,
                    // hoveron: "violins",
                    hoverinfo: "none",
                    meanline_visible: true,
                    orientation: "h",
                    side: "positive",
                    width: 2,
                    points: false,
                };
                traces.push(trace);
            });
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

        for (let i = 1; i <= props.dataArr.length; i++) {
            layout[`xaxis${i}`] = {
                title: props.dataArr[i - 1].parameterIdent,
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
                text: props.dataArr[i - 1].parameterIdent.name,
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
};
