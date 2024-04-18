import React from "react";
import Plot from "react-plotly.js";

import { PlotType } from "plotly.js";

import { ParameterDataArr, ParameterDistributionPlotType } from "../../typesAndEnums";

type ParameterDistributionPlotProps = {
    dataArr: ParameterDataArr[];
    ensembleColors: Map<string, string>;
    plotType: ParameterDistributionPlotType;
    showIndividualRealizationValues: boolean;
    width: number;
    height: number;
};

export const ParameterDistributionPlot: React.FC<ParameterDistributionPlotProps> = (props) => {
    const numSubplots = props.dataArr.length;
    const numColumns = Math.ceil(Math.sqrt(numSubplots));
    const numRows = Math.ceil(numSubplots / numColumns);
    const addedLegendNames: Set<string> = new Set();

    const showRugTraces =
        props.plotType == ParameterDistributionPlotType.DISTRIBUTION_PLOT && props.showIndividualRealizationValues;

    function generateDistributionPlotTraces(): any[] {
        const traces: any[] = [];
        let subplotIndex = 1;

        props.dataArr.forEach((parameterData) => {
            parameterData.ensembleParameterRealizationAndValues.forEach((ensembleValue, index) => {
                const shouldShowLegend = !addedLegendNames.has(ensembleValue.ensembleDisplayName);
                if (shouldShowLegend) {
                    addedLegendNames.add(ensembleValue.ensembleDisplayName);
                }

                const distributionTrace = {
                    x: ensembleValue.values,
                    type: "violin" as PlotType,
                    spanmode: "hard",
                    name: ensembleValue.ensembleDisplayName,
                    legendgroup: ensembleValue.ensembleDisplayName,
                    marker: { color: props.ensembleColors.get(ensembleValue.ensembleDisplayName) },
                    xaxis: `x${subplotIndex}`,
                    yaxis: `y${subplotIndex}`,
                    showlegend: shouldShowLegend,
                    y0: 0,
                    hoverinfo: "none",
                    meanline_visible: true,
                    orientation: "h",
                    side: "positive",
                    width: 2,
                    points: false,
                };
                traces.push(distributionTrace);

                if (props.showIndividualRealizationValues) {
                    const hoverText = ensembleValue.values.map(
                        (_, index) => `Realization: ${ensembleValue.realizations[index]}`
                    );

                    // Distribution plot shows positive values, thus the rug plot is placed below 0
                    // Align the realization values horizontally below the distribution plot
                    const yValues = ensembleValue.values.map(() => -0.1 - index * 0.1); // Align horizontally below 0

                    const rugTrace = {
                        x: ensembleValue.values, // Use the same x values as your main trace
                        y: yValues,
                        type: "rug", // Set type to 'rug' for the rug plot
                        name: ensembleValue.ensembleDisplayName,
                        legendgroup: ensembleValue.ensembleDisplayName,
                        xaxis: `x${subplotIndex}`,
                        yaxis: `y${subplotIndex}`,
                        hovertext: hoverText,
                        hoverinfo: "x+text+name",
                        mode: "markers",
                        marker: {
                            color: props.ensembleColors.get(ensembleValue.ensembleDisplayName),
                            symbol: "line-ns-open",
                        },
                        showlegend: false,
                    };
                    traces.push(rugTrace);
                }
            });
            subplotIndex++;
        });

        return traces;
    }

    function generateBoxPlotTraces(): any[] {
        const traces: any[] = [];
        let subplotIndex = 1;

        props.dataArr.forEach((parameterData) => {
            parameterData.ensembleParameterRealizationAndValues.forEach((ensembleValue, index) => {
                const shouldShowLegend = !addedLegendNames.has(ensembleValue.ensembleDisplayName);
                if (shouldShowLegend) {
                    addedLegendNames.add(ensembleValue.ensembleDisplayName);
                }

                if (ensembleValue.values.length !== ensembleValue.realizations.length) {
                    throw new Error("Realizations and values must have the same length");
                }

                const verticalPosition = index * (2 + 1); // 2 is the height of each box + 1 space
                const hoverText = ensembleValue.values.map(
                    (_, index) => `Realization: ${ensembleValue.realizations[index]}`
                );

                const trace = {
                    x: ensembleValue.values,
                    type: "box",
                    name: ensembleValue.ensembleDisplayName,
                    legendgroup: ensembleValue.ensembleDisplayName,
                    marker: { color: props.ensembleColors.get(ensembleValue.ensembleDisplayName) },
                    xaxis: `x${subplotIndex}`,
                    yaxis: `y${subplotIndex}`,
                    showlegend: shouldShowLegend,
                    y0: verticalPosition,
                    hoverinfo: "x+text+name",
                    hovertext: hoverText,
                    meanline_visible: true,
                    orientation: "h",
                    side: "positive",
                    width: 2,
                    points: false,
                    boxpoints: props.showIndividualRealizationValues ? "all" : "outliers",
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
                zeroline: false,
                linewidth: 1,
                linecolor: "black",
            };

            layout[`yaxis${i}`] = {
                showticklabels: false,
                showgrid: false,
                zeroline: showRugTraces,
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

    let data = [];
    if (props.plotType == ParameterDistributionPlotType.DISTRIBUTION_PLOT) {
        data = generateDistributionPlotTraces();
    }
    if (props.plotType == ParameterDistributionPlotType.BOX_PLOT) {
        data = generateBoxPlotTraces();
    }
    const layout = generateLayout();

    return <Plot data={data} layout={layout} config={{ displayModeBar: false }} />;
};
