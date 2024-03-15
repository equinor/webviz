import { ScatterLine } from "plotly.js";

import { TimeSeriesPlotData } from "../timeSeriesPlotData";

/**
    Definition of line trace data for statistics plot
 
    * `data` - List of value data
    * `name` - Name of line data
 */
export type LineData = {
    data: number[];
    name: string;
};

/**
    Definition of statistics data utilized in creation of statistical plot traces

    `Attributes:`
    * `samples` - Common sample point list for each following value list. Can be list of strings or numbers
    * `freeLine` - LineData with name and value data for free line trace in statistics plot
     (e.g. mean, median, etc.)
    * `minimum` - Optional list of minimum value data for statistics plot
    * `maximum` - Optional list of maximum value data for statistics plot
    * `lowPercentile` - Optional low percentile, name and data values for statistics plot
    * `midPercentile` - Optional middle percentile, name and data values for statistics plot
    * `highPercentile` - Optional high percentile, name and data values for statistics plot
 */
export type StatisticsData = {
    samples: string[] | number[];
    freeLine?: LineData;
    minimum?: number[];
    maximum?: number[];
    lowPercentile?: LineData;
    highPercentile?: LineData;
    midPercentile?: LineData;
};

/**
    Validation of statistics data

    Ensure equal length of all statistical data lists and x-axis data list

    Throw error if lengths are unequal
 */
function validateStatisticsData(data: StatisticsData): void {
    const samplesLength = data.samples.length;

    if (samplesLength <= 0) {
        throw new Error("Empty x-axis data list in StatisticsData");
    }

    if (data.freeLine !== undefined && samplesLength !== data.freeLine.data.length) {
        throw new Error(
            `Invalid statistics mean value data length. data.samples.length (${samplesLength}) != data.freeLine.data.length (${data.freeLine.data.length})`
        );
    }

    if (data.minimum !== undefined && samplesLength !== data.minimum.length) {
        throw new Error(
            `Invalid statistics minimum value data length. data.samples.length (${samplesLength}) != data.minimum.length (${data.minimum.length})`
        );
    }

    if (data.maximum !== undefined && samplesLength !== data.maximum.length) {
        throw new Error(
            `Invalid statistics maximum value data length. data.samples.length (${samplesLength}) != data.maximum.length (${data.maximum.length})`
        );
    }

    if (data.lowPercentile !== undefined && samplesLength !== data.lowPercentile.data.length) {
        throw new Error(
            `Invalid statistics low percentile value data length. data.samples.length (${samplesLength}) != data.lowPercentile.data.length (${data.lowPercentile.data.length})`
        );
    }

    if (data.midPercentile !== undefined && samplesLength !== data.midPercentile.data.length) {
        throw new Error(
            `Invalid statistics middle percentile value data length. data.samples.length (${samplesLength}) != data.midPercentile.data.length (${data.midPercentile.data.length})`
        );
    }

    if (data.highPercentile !== undefined && samplesLength !== data.highPercentile.data.length) {
        throw new Error(
            `Invalid statistics high percentile value data length. data.samples.length (${samplesLength}) != data.highPercentile.data.length (${data.highPercentile.data.length})`
        );
    }
}

/**
    Definition of options for creating statistical plot trace

    To be used as input to createStatisticsTraces function with default values for optional arguments.
 */
export type CreateStatisticsTracesOptions = {
    data: StatisticsData;
    color: string;
    legendGroup: string;
    lineShape?: ScatterLine["shape"];
    showLegend?: boolean;
    hoverTemplate?: string;
    legendRank?: number;
    xaxis?: string;
    yaxis?: string;
    lineWidth?: number;
    showHoverInfo?: boolean;
    hoverText?: string;
    name?: string;
    type?: "scatter" | "scattergl";
    // hovermode?: string,
};

/**
    Utility function for creating statistical plot traces

    Takes `data` containing data for each statistical feature as input, and creates a list of traces
    for each feature. Plotly plots traces from front to end of the list, thereby the last trace is
    plotted on top.

    Note that the data is optional, which implies that only wanted statistical features needs to be
    provided for trace plot generation.

    The function provides a list of traces: [trace0, tract1, ..., traceN]

    Note:
    If hovertemplate is proved it overrides the hovertext

    Returns:
    List of statistical line traces, one for each statistical feature in data input.
    [trace0, tract1, ..., traceN].
 */
export function createStatisticsTraces({
    data,
    color,
    legendGroup,
    name = undefined,
    lineShape = "linear",
    lineWidth = 2,
    xaxis = "x",
    yaxis = "y",
    showLegend = true,
    showHoverInfo = true,
    hoverText = "",
    hoverTemplate = undefined,
    legendRank = undefined,
    type = "scatter",
}: CreateStatisticsTracesOptions): Partial<TimeSeriesPlotData>[] {
    // NOTE:
    // - hovermode? not exposed?

    validateStatisticsData(data);

    function getDefaultTrace(statisticsName: string, values: number[]): Partial<TimeSeriesPlotData> {
        const trace: Partial<TimeSeriesPlotData> = {
            name: name ?? legendGroup,
            x: data.samples,
            y: values,
            xaxis: xaxis,
            yaxis: yaxis,
            mode: "lines",
            type: type,
            line: { color: color, width: lineWidth, shape: lineShape },
            legendgroup: legendGroup,
            showlegend: false,
        };
        if (legendRank !== undefined) {
            trace.legendrank = legendRank;
        }
        if (!showHoverInfo) {
            trace.hoverinfo = "skip";
            return trace;
        }
        if (hoverTemplate !== undefined) {
            trace.hovertemplate = hoverTemplate + statisticsName;
        } else {
            trace.hovertext = statisticsName + " " + hoverText;
        }
        return trace;
    }

    const traces: Partial<TimeSeriesPlotData>[] = [];

    // Minimum
    if (data.minimum !== undefined) {
        const minimumTrace = getDefaultTrace("Minimum", data.minimum);
        if (minimumTrace.line) {
            minimumTrace.line.dash = "longdash";
        }
        traces.push(minimumTrace);
    }

    // Low percentile
    if (data.lowPercentile !== undefined) {
        const lowPercentileTrace = getDefaultTrace(data.lowPercentile.name, data.lowPercentile.data);
        if (lowPercentileTrace.line) {
            lowPercentileTrace.line.dash = "dashdot";
        }
        traces.push(lowPercentileTrace);
    }

    // Mid percentile
    if (data.midPercentile !== undefined) {
        const midPercentileTrace = getDefaultTrace(data.midPercentile.name, data.midPercentile.data);
        if (midPercentileTrace.line) {
            midPercentileTrace.line.dash = "dot";
        }
        traces.push(midPercentileTrace);
    }

    // High percentile
    if (data.highPercentile !== undefined) {
        const highPercentileTrace = getDefaultTrace(data.highPercentile.name, data.highPercentile.data);
        if (highPercentileTrace.line) {
            highPercentileTrace.line.dash = "dashdot";
        }
        traces.push(highPercentileTrace);
    }

    // Maximum
    if (data.maximum !== undefined) {
        const maximumTrace = getDefaultTrace("Maximum", data.maximum);
        if (maximumTrace.line) {
            maximumTrace.line.dash = "longdash";
        }
        traces.push(maximumTrace);
    }

    // Free line
    if (data.freeLine !== undefined) {
        const freeLineTrace = getDefaultTrace(data.freeLine.name, data.freeLine.data);
        traces.push(freeLineTrace);
    }

    // Set legend for last trace in list
    if (traces.length > 0) {
        traces[traces.length - 1].showlegend = showLegend;
    }

    return traces;
}
