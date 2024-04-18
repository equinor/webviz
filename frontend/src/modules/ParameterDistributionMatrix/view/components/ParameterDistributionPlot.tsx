import React from "react";
import Plot from "react-plotly.js";

import { computeQuantile } from "@modules_shared/statistics";

import { PlotType } from "plotly.js";

import { ParameterDataArr, ParameterDistributionPlotType } from "../../typesAndEnums";

type ParameterDistributionPlotProps = {
    dataArr: ParameterDataArr[];
    ensembleColors: Map<string, string>;
    plotType: ParameterDistributionPlotType;
    showIndividualRealizationValues: boolean;
    showPercentilesAndMeanLines: boolean;
    width: number;
    height: number;
};

export const ParameterDistributionPlot: React.FC<ParameterDistributionPlotProps> = (props) => {
    const numSubplots = props.dataArr.length;
    const numColumns = Math.ceil(Math.sqrt(numSubplots));
    const numRows = Math.ceil(numSubplots / numColumns);
    const addedLegendNames: Set<string> = new Set();

    const p90Dash = "dashdot";
    const p10Dash = "dash";
    const meanDash = "dot";
    const showRugTraces =
        props.plotType == ParameterDistributionPlotType.DISTRIBUTION_PLOT && props.showIndividualRealizationValues;

    function generateDistributionPlotTraces(): any[] {
        const traces: any[] = [];
        let subplotIndex = 1;

        props.dataArr.forEach((parameterData) => {
            parameterData.ensembleParameterRealizationAndValues.forEach((ensembleData, index) => {
                const shouldShowLegend = !addedLegendNames.has(ensembleData.ensembleDisplayName);
                if (shouldShowLegend) {
                    addedLegendNames.add(ensembleData.ensembleDisplayName);
                }

                const distributionTrace = {
                    x: ensembleData.values,
                    type: "violin" as PlotType,
                    spanmode: "hard",
                    name: ensembleData.ensembleDisplayName,
                    legendgroup: ensembleData.ensembleDisplayName,
                    marker: { color: props.ensembleColors.get(ensembleData.ensembleDisplayName) },
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
                    const hoverText = ensembleData.values.map(
                        (_, index) => `Realization: ${ensembleData.realizations[index]}`
                    );

                    // Distribution plot shows positive values, thus the rug plot is placed below 0.
                    // Align the realization values horizontally below the distribution plot
                    const yPosition = -0.1 - index * 0.1; // Offset -0.1, and 0.1 between each ensemble
                    const yValues = ensembleData.values.map(() => yPosition); // Align all values to the same y-position

                    const rugTrace = {
                        x: ensembleData.values, // Use the same x values as your main trace
                        y: yValues,
                        type: "rug", // Set type to 'rug' for the rug plot
                        name: ensembleData.ensembleDisplayName,
                        legendgroup: ensembleData.ensembleDisplayName,
                        xaxis: `x${subplotIndex}`,
                        yaxis: `y${subplotIndex}`,
                        hovertext: hoverText,
                        hoverinfo: "x+text+name",
                        mode: "markers",
                        marker: {
                            color: props.ensembleColors.get(ensembleData.ensembleDisplayName),
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
            parameterData.ensembleParameterRealizationAndValues.forEach((ensembleData, index) => {
                const shouldShowLegend = !addedLegendNames.has(ensembleData.ensembleDisplayName);
                if (shouldShowLegend) {
                    addedLegendNames.add(ensembleData.ensembleDisplayName);
                }

                if (ensembleData.values.length !== ensembleData.realizations.length) {
                    throw new Error("Realizations and values must have the same length");
                }

                const verticalPosition = index * (2 + 1); // 2 is the height of each box + 1 space
                const hoverText = ensembleData.values.map(
                    (_, index) => `Realization: ${ensembleData.realizations[index]}`
                );

                const trace = {
                    x: ensembleData.values,
                    type: "box",
                    name: ensembleData.ensembleDisplayName,
                    legendgroup: ensembleData.ensembleDisplayName,
                    marker: { color: props.ensembleColors.get(ensembleData.ensembleDisplayName) },
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

    function generatePercentileShapes(): any {
        const shapes: any[] = [];
        let subplotIndex = 1;

        props.dataArr.forEach((parameterData) => {
            const defaultShape = {
                type: "line",
                xref: `x${subplotIndex}`, // Reference for x-coordinates is the x-axis
                yref: `y${subplotIndex} domain`, // Reference for y-coordinates is local domain
                y0: 0, // y-coordinate for the start of the line (bottom of the plot)
                y1: 1.0, // y-coordinate for the end of the line (top of the plot)
            };

            parameterData.ensembleParameterRealizationAndValues.forEach((ensembleData) => {
                const p90 = computeQuantile(ensembleData.values, 0.9);
                const p10 = computeQuantile(ensembleData.values, 0.1);
                const mean = ensembleData.values.reduce((a, b) => a + b, 0) / ensembleData.values.length;
                shapes.push(
                    ...[
                        {
                            ...defaultShape,
                            x0: p90,
                            x1: p90,
                            line: {
                                color: props.ensembleColors.get(ensembleData.ensembleDisplayName),
                                width: 2,
                                dash: p90Dash,
                            },
                        },
                        {
                            ...defaultShape,
                            x0: p10,
                            x1: p10,
                            line: {
                                color: props.ensembleColors.get(ensembleData.ensembleDisplayName),
                                width: 2,
                                dash: p10Dash,
                            },
                        },
                        {
                            ...defaultShape,
                            x0: mean,
                            x1: mean,
                            line: {
                                color: props.ensembleColors.get(ensembleData.ensembleDisplayName),
                                width: 2,
                                dash: meanDash,
                            },
                        },
                    ]
                );
            });

            subplotIndex++;
        });

        return shapes;
    }

    function generatePercentileEmptyTracesForLegend(): any {
        const defaultEmptyTrace = {
            x: [NaN], // x-coordinate of the shape (empty array because it's a non-data trace)
            y: [NaN], // y-coordinate of the shape (empty array because it's a non-data trace)
            mode: "lines", // Set mode to 'markers' to have no lines connecting points
        };

        return [
            {
                ...defaultEmptyTrace,
                line: {
                    dash: p10Dash, // Set the line style for legend
                    color: "black",
                },
                name: "P10", // Set name to display in the legend
            },
            {
                ...defaultEmptyTrace,
                line: {
                    dash: meanDash, // Set the line style for legend
                    color: "black",
                },
                name: "Mean", // Set name to display in the legend
            },
            {
                ...defaultEmptyTrace,
                line: {
                    dash: p90Dash, // Set the line style for legend
                    color: "black",
                },
                name: "P90", // Set name to display in the legend
            },
        ];
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
    if (props.showPercentilesAndMeanLines) {
        layout["shapes"] = generatePercentileShapes();
        data.push(...generatePercentileEmptyTracesForLegend());
    }

    return <Plot data={data} layout={layout} config={{ displayModeBar: false }} />;
};
