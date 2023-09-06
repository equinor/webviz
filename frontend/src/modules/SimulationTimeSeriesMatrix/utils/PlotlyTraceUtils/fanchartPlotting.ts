import { formatRgb, modeRgb, useMode } from "culori";
import { ScatterLine } from "plotly.js";

import { TimeSeriesPlotData } from "../timeSeriesPlotData";

/**
    Definition of statistics data for free line trace in fanchart
 
    * `name` - Name of statistics data (e.g. mean, median, etc.)
    * `data` - List of statistics value data
 */
export type FreeLineData = {
    name: string;
    data: number[];
};

/**
    Defining paired low and high percentile data for fanchart plotting
 
    * `lowData` - List of low percentile data
    * `lowName` - Name of low percentile data (e.g. 10th percentile)
    * `highData` - List of high percentile data
    * `highName` - Name of high percentile data (e.g. 90th percentile)
 */
export type LowHighData = {
    lowData: number[];
    lowName: string;
    highData: number[];
    highName: string;
};

/**
    Definition of paired minimum and maximum data for fanchart plotting

    * `minimum` - List of minimum value data
    * `maximum` - List of maximum value data
 */
export type MinMaxData = {
    minimum: number[];
    maximum: number[];
};

/**
    Type defining fanchart data utilized in creation of statistical fanchart traces

    * `samples` - Common sample point list for each following value list. Can be list of strings or numbers
    * `freeLine` - Optional statistics with name and value data for free line trace in fanchart (e.g.
     mean, median, etc.)
    * `minimumMaximum` - Paired optional minimum and maximum data for fanchart plotting
    * `lowHigh` - Paired optional low and high percentile names and data for fanchart plotting
 */
export type FanchartData = {
    samples: string[] | number[];
    freeLine?: FreeLineData;
    minimumMaximum?: MinMaxData;
    lowHigh?: LowHighData;
};

/**
    Direction of traces in fanchart
 */
enum TraceDirection {
    HORIZONTAL = "horizontal",
    VERTICAL = "vertical",
}

/** 
    Validation of fanchart data

    Ensure equal length of all statistical fanchart data lists and x-axis data list

    Throw error if lengths are unequal
*/
function validateFanchartData(data: FanchartData): void {
    const samplesLength = data.samples.length;

    if (samplesLength <= 0) {
        throw new Error("Empty x-axis data list in FanchartData");
    }

    if (data.freeLine !== undefined && samplesLength !== data.freeLine.data.length) {
        throw new Error("Invalid fanchart mean value data length. data.samples.length !== freeLine.data.length");
    }

    if (data.minimumMaximum !== undefined && samplesLength !== data.minimumMaximum.minimum.length) {
        throw new Error(
            "Invalid fanchart minimum value data length. data.samples.length !== data.minimumMaximum.minimum.length"
        );
    }

    if (data.minimumMaximum !== undefined && samplesLength !== data.minimumMaximum.maximum.length) {
        throw new Error(
            "Invalid fanchart maximum value data length. data.samples.length !== data.minimumMaximum.maximum.length"
        );
    }

    if (data.lowHigh !== undefined && samplesLength !== data.lowHigh.lowData.length) {
        throw new Error(
            "Invalid fanchart low percentile value data length. data.samples.length !== data.lowHigh.lowData.length"
        );
    }

    if (data.lowHigh !== undefined && samplesLength !== data.lowHigh.highData.length) {
        throw new Error(
            "Invalid fanchart high percentile value data length. data.samples.length !== data.lowHigh.highData.length"
        );
    }
}

/**
    Definition of options for creating statistical fanchart traces

    To be used as input to createFanchartTraces function with default values for optional arguments.
 */
export type CreateFanchartTracesOptions = {
    data: FanchartData;
    hexColor: string;
    legendGroup: string;
    lineShape?: ScatterLine["shape"];
    showLegend?: boolean;
    hoverTemplate?: string;
    legendRank?: number;
    yaxis?: string;
    xaxis?: string;
    direction?: TraceDirection;
    showHoverInfo?: boolean;
    hoverText?: string;
    legendName?: string;
    // hovermode?: string,
};

/**
    Utility function for creating statistical fanchart traces

    Takes `data` containing data for each statistical feature as input, and creates a list of traces
    for each feature. Plotly plots traces from front to end of the list, thereby the last trace is
    plotted on top.

    Note that min and max, and high and low percentile are paired optional statistics. This implies
    that if minimum is provided, maximum must be provided as well, and vice versa. The same yields
    for low and high percentile data.

    The function provides a list of traces: [trace0, tract1, ..., traceN]

    Fanchart is created by use of fill "tonexty" configuration for the traces. Fill "tonexty" is
    misleading naming, as "tonexty" in trace1 fills to y in trace0, i.e y in previous trace.

    The order of traces are minimum, low, high, maximum and free line. Thus it is required that
    values in minimum <= low, and low <= high, and high <= maximum. Fill is setting "tonexty" in
    this function is set s.t. trace fillings are not stacked making colors in fills unchanged
    when disabling trace statistics inputs (minimum and maximum or low and high).

    Free line is last trace and is plotted on top as a line - without filling to other traces.

    Note:
    If hovertemplate is proved it overrides the hovertext

    Returns:
    List of fanchart traces, one for each statistical feature in data input.
    [trace0, tract1, ..., traceN].
 */
export function createFanchartTraces({
    data,
    hexColor,
    legendGroup,
    lineShape = "linear",
    showLegend = true,
    hoverTemplate = undefined,
    legendRank = undefined,
    yaxis = "y",
    xaxis = "x",
    direction = TraceDirection.HORIZONTAL,
    showHoverInfo = true,
    hoverText = "",
    legendName = undefined,
}: CreateFanchartTracesOptions): Partial<TimeSeriesPlotData>[] {
    // NOTE:
    // - hovermode? not exposed?

    // TODO: Remove unused default arguments?

    validateFanchartData(data);

    const convertRgb = useMode(modeRgb);
    const rgb = convertRgb(hexColor);
    if (rgb === undefined) {
        throw new Error("Invalid conversion of hex color string: " + hexColor + " to rgb.");
    }
    const fillColorLight = formatRgb({ ...rgb, alpha: 0.3 });
    const fillColorDark = formatRgb({ ...rgb, alpha: 0.6 });
    const lineColor = formatRgb({ ...rgb, alpha: 1.0 });

    function getDefaultTrace(statisticsName: string, values: number[]): Partial<TimeSeriesPlotData> {
        const trace: Partial<TimeSeriesPlotData> = {
            name: legendName ?? legendGroup,
            x: direction === TraceDirection.HORIZONTAL ? data.samples : values,
            y: direction === TraceDirection.HORIZONTAL ? values : data.samples,
            xaxis: xaxis,
            yaxis: yaxis,
            mode: "lines",
            type: "scatter",
            line: { width: 0, color: lineColor, shape: lineShape },
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
    if (data.minimumMaximum !== undefined) {
        traces.push(getDefaultTrace("Minimum", data.minimumMaximum.minimum));
    }

    // Low and high percentile
    if (data.lowHigh !== undefined) {
        const lowTrace = getDefaultTrace(data.lowHigh.lowName, data.lowHigh.lowData);

        // Add fill to previous trace
        if (traces.length > 0) {
            lowTrace.fill = "tonexty";
            lowTrace.fillcolor = fillColorLight;
        }
        traces.push(lowTrace);

        const highTrace = getDefaultTrace(data.lowHigh.highName, data.lowHigh.highData);
        highTrace.fill = "tonexty";
        highTrace.fillcolor = fillColorDark;
        traces.push(highTrace);
    }

    // Maximum
    if (data.minimumMaximum !== undefined) {
        const maximumTrace = getDefaultTrace("Maximum", data.minimumMaximum.maximum);

        // Add fill to previous trace
        if (traces.length > 0) {
            maximumTrace.fill = "tonexty";
            maximumTrace.fillcolor = fillColorLight;
        }
        traces.push(maximumTrace);
    }

    // Free line - solid line
    if (data.freeLine !== undefined) {
        const lineTrace = getDefaultTrace(data.freeLine.name, data.freeLine.data);
        lineTrace.line = { color: lineColor, shape: lineShape };
        traces.push(lineTrace);
    }

    // Set legend for last trace in list
    if (traces.length > 0) {
        traces[traces.length - 1].showlegend = showLegend;
    }

    return traces;
}
