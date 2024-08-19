import React from "react";
import Plot from "react-plotly.js";

import { computeQuantile } from "@modules_shared/statistics";

import { PlotType } from "plotly.js";

import { ParameterDataArr, ParameterDistributionPlotType } from "../../typesAndEnums";

type ParameterDistributionPlotProps = {
    dataArr: ParameterDataArr[];
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
                    marker: { color: ensembleData.ensembleColor },
                    xaxis: `x${subplotIndex}`,
                    yaxis: `y${subplotIndex}`,
                    showlegend: shouldShowLegend,
                    y0: 0,
                    hoverinfo: "none",
                    meanline: { visible: true },
                    orientation: "h",
                    side: "positive",
                    width: 2,
                    points: false,
                };
                traces.push(distributionTrace);

                if (props.showPercentilesAndMeanLines) {
                    const yPosition = 0;
                    traces.push(
                        ...createQuantileAndMeanMarkerTraces(
                            ensembleData.values,
                            yPosition,
                            ensembleData.ensembleDisplayName,
                            ensembleData.ensembleColor,
                            subplotIndex
                        )
                    );
                }

                if (props.showIndividualRealizationValues) {
                    const hoverText = ensembleData.values.map(
                        (_, index) => `Realization: ${ensembleData.realizations[index]}`
                    );

                    // Distribution plot shows positive values, thus the rug plot is placed below 0.
                    // Align the realization values horizontally below the distribution plot
                    const yPosition = -0.1 - index * 0.1; // Offset -0.1, and 0.1 between each ensemble
                    const yValues = ensembleData.values.map(() => yPosition); // Align horizontally with same y-position

                    const rugTrace = {
                        x: ensembleData.values, // Use the same x values as your main trace
                        y: yValues,
                        type: "rug",
                        name: ensembleData.ensembleDisplayName,
                        legendgroup: ensembleData.ensembleDisplayName,
                        xaxis: `x${subplotIndex}`,
                        yaxis: `y${subplotIndex}`,
                        hovertext: hoverText,
                        hoverinfo: "x+text+name",
                        mode: "markers",
                        marker: {
                            color: ensembleData.ensembleColor,
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
                    marker: { color: ensembleData.ensembleColor },
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

                if (props.showPercentilesAndMeanLines) {
                    traces.push(
                        ...createQuantileAndMeanMarkerTraces(
                            ensembleData.values,
                            verticalPosition,
                            ensembleData.ensembleDisplayName,
                            ensembleData.ensembleColor,
                            subplotIndex
                        )
                    );
                }
            });
            subplotIndex++;
        });

        return traces;
    }

    function createQuantileAndMeanMarkerTraces(
        parameterValues: number[],
        yPosition: number,
        ensembleName: string,
        ensembleColor: string | undefined,
        subplotIndex: number
    ): any[] {
        const p90 = computeQuantile(parameterValues, 0.9);
        const p10 = computeQuantile(parameterValues, 0.1);
        const mean = parameterValues.reduce((a, b) => a + b, 0) / parameterValues.length;
        const p10Trace = {
            x: [p10],
            y: [yPosition],
            type: "scatter",
            hoverinfo: "x+text",
            hovertext: "P10",
            showlegend: false,
            legendgroup: ensembleName,
            xaxis: `x${subplotIndex}`,
            yaxis: `y${subplotIndex}`,
            marker: { color: ensembleColor, symbol: "x", size: 10 },
        };
        const meanTrace = {
            x: [mean],
            y: [yPosition],
            type: "scatter",
            hoverinfo: "x+text",
            hovertext: "Mean",
            showlegend: false,
            legendgroup: ensembleName,
            xaxis: `x${subplotIndex}`,
            yaxis: `y${subplotIndex}`,
            marker: { color: ensembleColor, symbol: "x", size: 10 },
        };
        const p90Trace = {
            x: [p90],
            y: [yPosition],
            type: "scatter",
            hoverinfo: "x+text",
            hovertext: "P90",
            showlegend: false,
            legendgroup: ensembleName,
            xaxis: `x${subplotIndex}`,
            yaxis: `y${subplotIndex}`,
            marker: { color: ensembleColor, symbol: "x", size: 10 },
        };

        return [p10Trace, meanTrace, p90Trace];
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
                type: props.dataArr[i - 1].isLogarithmic ? "log" : "linear",
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
