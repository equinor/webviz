import type { BoxPlotData, Layout, PlotData } from "plotly.js";

import { makeHistogramTrace } from "@modules/_shared/histogram";
import { computeQuantile } from "@modules/_shared/utils/math/statistics";

import { ParameterDistributionPlotType } from "../../typesAndEnums";

import type { EnsembleParameterRealizationsAndValues, EnsembleSetParameterArray } from "./ensembleSetParameterArray";

export interface TraceGenerationOptions {
    plotType: ParameterDistributionPlotType;
    showIndividualRealizationValues: boolean;
    showPercentilesAndMeanLines: boolean;
}

/**
 * Creates quantile (P10, P90) and mean marker traces for a parameter
 */
export function createQuantileAndMeanMarkerTraces(
    parameterValues: number[],
    yPosition: number,
    ensembleColor: string | undefined,
): Partial<PlotData>[] {
    const p90 = computeQuantile(parameterValues, 0.9);
    const p10 = computeQuantile(parameterValues, 0.1);
    const mean = parameterValues.reduce((a, b) => a + b, 0) / parameterValues.length;

    const p10Trace: Partial<PlotData> = {
        x: [p10],
        y: [yPosition],
        type: "scatter",
        hoverinfo: "x+text",
        hovertext: "P10",
        showlegend: false,
        marker: { color: ensembleColor, symbol: "x", size: 10 },
    };

    const meanTrace: Partial<PlotData> = {
        x: [mean],
        y: [yPosition],
        type: "scatter",
        hoverinfo: "x+text",
        hovertext: "Mean",
        showlegend: false,
        marker: { color: ensembleColor, symbol: "x", size: 10 },
    };

    const p90Trace: Partial<PlotData> = {
        x: [p90],
        y: [yPosition],
        type: "scatter",
        hoverinfo: "x+text",
        hovertext: "P90",
        showlegend: false,
        marker: { color: ensembleColor, symbol: "x", size: 10 },
    };

    return [p10Trace, meanTrace, p90Trace];
}

/**
 * Creates a distribution plot trace (violin plot) for an ensemble
 */
export function createDistributionTrace(ensembleData: EnsembleParameterRealizationsAndValues): Partial<PlotData> {
    return {
        x: ensembleData.values,
        type: "violin",
        // @ts-expect-error - missing arguments in the plotly types
        spanmode: "hard",
        name: ensembleData.ensembleDisplayName,
        legendgroup: ensembleData.ensembleDisplayName,
        marker: { color: ensembleData.ensembleColor },
        showlegend: false,
        y0: 0,
        hoverinfo: "none",
        meanline: { visible: true },
        orientation: "h",
        side: "positive",
        width: 2,
        points: false,
    };
}

/**
 * Creates a rug plot trace for individual realization values
 */
export function createRugTrace(
    ensembleData: EnsembleParameterRealizationsAndValues,
    yPosition: number,
): Partial<PlotData> {
    const hoverText = ensembleData.values.map((_, i) => `Realization: ${ensembleData.realizations[i]}`);
    const yValues = ensembleData.values.map(() => yPosition);

    return {
        x: ensembleData.values,
        y: yValues,
        // @ts-expect-error - missing arguments in the plotly types
        type: "rug",
        name: ensembleData.ensembleDisplayName,
        legendgroup: ensembleData.ensembleDisplayName,
        hovertext: hoverText,
        // @ts-expect-error - missing arguments in the plotly types
        hoverinfo: "x+text+name",
        mode: "markers",
        marker: { color: ensembleData.ensembleColor, symbol: "line-ns-open" },
        showlegend: false,
    };
}

/**
 * Creates a box plot trace for an ensemble
 */
export function createBoxTrace(
    ensembleData: EnsembleParameterRealizationsAndValues,
    verticalPosition: number,
    showIndividualRealizationValues: boolean,
): Partial<BoxPlotData> {
    const hoverText = ensembleData.values.map((_, i) => `Realization: ${ensembleData.realizations[i]}`);

    return {
        x: ensembleData.values,
        type: "box",
        name: ensembleData.ensembleDisplayName,
        legendgroup: ensembleData.ensembleDisplayName,
        marker: { color: ensembleData.ensembleColor },
        showlegend: false,
        y0: verticalPosition,
        // @ts-expect-error - missing arguments in the plotly types
        hoverinfo: "x+text+name",
        hovertext: hoverText,
        meanline_visible: true,
        orientation: "h",
        side: "positive",
        width: 2,
        points: false,
        boxpoints: showIndividualRealizationValues ? "all" : "outliers",
    };
}

/**
 * Creates a histogram trace for an ensemble
 */
export function createHistogramTrace(ensembleData: EnsembleParameterRealizationsAndValues): Partial<PlotData> {
    const numBins = Math.min(20, Math.max(5, Math.floor(Math.sqrt(ensembleData.values.length))));
    const histogramTrace = makeHistogramTrace({
        xValues: ensembleData.values,
        numBins: numBins,
        color: ensembleData.ensembleColor,
        showPercentageInBar: false,
    });

    return {
        ...histogramTrace,
        name: ensembleData.ensembleDisplayName,
        showlegend: false,
    };
}

export function generateLayoutForParameter({
    title,
    xAxisIsLogarithmic,
    showZeroLine,
}: {
    title: string;
    xAxisIsLogarithmic: boolean;
    showZeroLine: boolean;
}): Partial<Layout> {
    return {
        margin: { l: 50, r: 10, b: 50, t: 50 },
        title: {
            text: title,
            x: 0.5,
            y: 0.95,
            font: { size: 10 },
            xanchor: "center",
            yanchor: "top",
        },
        barmode: "overlay",
        xaxis: {
            title: title,
            mirror: true,
            showline: true,
            zeroline: false,
            linecolor: "white",
            type: xAxisIsLogarithmic ? "log" : "linear",
        },
        yaxis: {
            showticklabels: false,
            showgrid: false,
            zeroline: showZeroLine,
            mirror: true,
            showline: true,
            linecolor: "white",
        },
    };
}
/**
 * Generates all traces for a single parameter based on plot type and options
 */
export function generateTracesForParameter(
    parameterData: EnsembleSetParameterArray,
    options: TraceGenerationOptions,
): Partial<PlotData>[] {
    const { plotType } = options;
    const traces: Partial<PlotData>[] = [];
    parameterData.ensembleParameterRealizationAndValues.forEach((ensembleData, index) => {
        if (plotType === ParameterDistributionPlotType.DISTRIBUTION_PLOT) {
            traces.push(...generateDistributionPlotTraces(ensembleData, index, options));
        } else if (plotType === ParameterDistributionPlotType.BOX_PLOT) {
            traces.push(...generateBoxPlotTraces(ensembleData, index, options));
        } else if (plotType === ParameterDistributionPlotType.HISTOGRAM) {
            traces.push(...generateHistogramTraces(ensembleData, options));
        }
    });
    return traces;
}
function generateDistributionPlotTraces(
    ensembleData: EnsembleParameterRealizationsAndValues,
    index: number,
    options: TraceGenerationOptions,
): Partial<PlotData>[] {
    const { showIndividualRealizationValues, showPercentilesAndMeanLines } = options;
    const traces: Partial<PlotData>[] = [];
    // Add main distribution trace
    const distributionTrace = createDistributionTrace(ensembleData);
    traces.push(distributionTrace);
    const yPosition = 0;
    // Add percentile and mean markers if enabled
    if (showPercentilesAndMeanLines) {
        traces.push(...createQuantileAndMeanMarkerTraces(ensembleData.values, yPosition, ensembleData.ensembleColor));
    }
    // Add rug plot for individual realizations if enabled
    if (showIndividualRealizationValues) {
        const rugYPosition = -0.1 - index * 0.1;
        const rugTrace = createRugTrace(ensembleData, rugYPosition);
        traces.push(rugTrace);
    }
    return traces;
}
function generateBoxPlotTraces(
    ensembleData: EnsembleParameterRealizationsAndValues,
    index: number,
    options: TraceGenerationOptions,
): Partial<PlotData>[] {
    const { showIndividualRealizationValues, showPercentilesAndMeanLines } = options;
    const traces: Partial<PlotData>[] = [];
    const verticalPosition = index * 3;
    // Add main box trace
    const boxTrace = createBoxTrace(ensembleData, verticalPosition, showIndividualRealizationValues);
    traces.push(boxTrace);
    // Add percentile and mean markers if enabled
    if (showPercentilesAndMeanLines) {
        traces.push(
            ...createQuantileAndMeanMarkerTraces(ensembleData.values, verticalPosition, ensembleData.ensembleColor),
        );
    }
    return traces;
}
function generateHistogramTraces(
    ensembleData: EnsembleParameterRealizationsAndValues,
    options: TraceGenerationOptions,
): Partial<PlotData>[] {
    const { showPercentilesAndMeanLines } = options;
    const traces: Partial<PlotData>[] = [];
    // Add main histogram trace
    const histogramTrace = createHistogramTrace(ensembleData);
    traces.push(histogramTrace);
    // Add percentile and mean markers if enabled
    if (showPercentilesAndMeanLines) {
        const yPosition = 1;
        traces.push(...createQuantileAndMeanMarkerTraces(ensembleData.values, yPosition, ensembleData.ensembleColor));
    }
    return traces;
}
