import {
    StatisticFunction_api,
    SummaryVectorDateObservation_api,
    VectorHistoricalData_api,
    VectorRealizationData_api,
    VectorStatisticData_api,
} from "@api";

import { FanchartData, FreeLineData, LowHighData, MinMaxData } from "./fanchartPlotting";
import { createFanchartTraces } from "./fanchartPlotting";
import { LineData, StatisticsData, createStatisticsTraces } from "./statisticsPlotting";

import { TimeSeriesPlotData } from "../timeSeriesPlotData";

/**
    Get line shape - "vh" for rate data, "linear" for non-rate data
 */
export function getLineShape(isRate: boolean): "linear" | "vh" {
    return isRate ? "vh" : "linear";
}

/**
    Definition of base options for creating vector realization trace for a vector realization data.
 */
type CreateRealizationTraceBaseOptions = {
    name?: string;
    color: string;
    legendGroup: string;
    hoverTemplate?: string;
    // lineShape?: "linear" | "spline" | "hv" | "vh" | "hvh" | "vhv";
    showLegend?: boolean;
    yaxis?: string;
    xaxis?: string;
    type?: "scatter" | "scattergl";
};

/**
    Utility function for creating vector realization trace for a vector realization data object
    for given vector.
 */
export type CreateVectorRealizationTraceOptions = CreateRealizationTraceBaseOptions & {
    vectorRealizationData: VectorRealizationData_api;
};
export function createVectorRealizationTrace({
    vectorRealizationData,
    name,
    color,
    legendGroup,
    hoverTemplate = "",
    showLegend = false,
    yaxis = "y",
    xaxis = "x",
    type = "scatter",
}: CreateVectorRealizationTraceOptions): Partial<TimeSeriesPlotData> {
    // TODO:
    // - type: "scattergl" or "scatter"? Maximum 8 WebGL contexts in Chrome gives issues?
    //         "scattergl" hides traces when zooming and panning for Ruben on work computer.
    // - lineShape - Each VectorRealizationData_api element has its own `is_rate` property. Should we
    //               use that to determine the line shape or provide a lineShape argument?

    return {
        x: vectorRealizationData.timestamps_utc_ms,
        y: vectorRealizationData.values,
        line: { width: 1, color: color, shape: getLineShape(vectorRealizationData.is_rate) },
        mode: "lines",
        type: type,
        hovertemplate: `${hoverTemplate}Realization: ${vectorRealizationData.realization}`,
        name: name,
        legendgroup: legendGroup,
        showlegend: vectorRealizationData.realization === 0 && showLegend ? true : false,
        yaxis: yaxis,
        xaxis: xaxis,
    } as Partial<TimeSeriesPlotData>;
}

/**
    Utility function for creating vector realization traces for an array of vector realization data
    for given vector.
 */
export type CreateVectorRealizationTracesOptions = CreateRealizationTraceBaseOptions & {
    vectorRealizationsData: VectorRealizationData_api[];
};
export function createVectorRealizationTraces({
    vectorRealizationsData,
    name,
    color,
    legendGroup,
    hoverTemplate = "",
    showLegend = false,
    yaxis = "y",
    xaxis = "x",
    type = "scatter",
}: CreateVectorRealizationTracesOptions): Partial<TimeSeriesPlotData>[] {
    // TODO:
    // - lineShape - Each VectorRealizationData_api element has its own `is_rate` property. Should we
    //               use that to determine the line shape or provide a lineShape argument?

    return vectorRealizationsData.map((realization) => {
        return createVectorRealizationTrace({
            vectorRealizationData: realization,
            name,
            color,
            legendGroup,
            hoverTemplate,
            showLegend,
            yaxis,
            xaxis,
            type,
        });
    });
}

/**
    Utility function for creating trace for historical vector data
 */
export type CreateHistoricalVectorTraceOptions = {
    vectorHistoricalData: VectorHistoricalData_api;
    color?: string;
    yaxis?: string;
    xaxis?: string;
    showLegend?: boolean;
    type?: "scatter" | "scattergl";
    // lineShape?: "linear" | "spline" | "hv" | "vh" | "hvh" | "vhv";
    name?: string;
    legendRank?: number;
};
export function createHistoricalVectorTrace({
    vectorHistoricalData,
    color = "black",
    yaxis = "y",
    xaxis = "x",
    showLegend = false,
    type = "scatter",
    name: name,
    legendRank,
}: CreateHistoricalVectorTraceOptions): Partial<TimeSeriesPlotData> {
    const hoverText = name ? `History: ${name}` : "History";
    return {
        line: { shape: getLineShape(vectorHistoricalData.is_rate), color: color },
        mode: "lines",
        type: type,
        x: vectorHistoricalData.timestamps_utc_ms,
        y: vectorHistoricalData.values,
        hovertext: hoverText,
        hoverinfo: "y+x+text",
        showlegend: showLegend,
        legendgroup: "History",
        legendrank: legendRank,
        yaxis: yaxis,
        xaxis: xaxis,
    };
}

/**
    Utility function for creating traces for vector observations
 */
export type CreateVectorObservationTraceOptions = {
    vectorObservations: Array<SummaryVectorDateObservation_api>;
    color?: string;
    yaxis?: string;
    xaxis?: string;
    legendGroup?: string;
    showLegend?: boolean;
    name?: string;
    type?: "scatter" | "scattergl";
};
export function createVectorObservationsTraces({
    vectorObservations,
    color = "black",
    yaxis = "y",
    xaxis = "x",
    legendGroup = "Observation",
    showLegend = false,
    name = undefined,
    type = "scatter",
}: CreateVectorObservationTraceOptions): Partial<TimeSeriesPlotData>[] {
    // NB: "scattergl" does not include "+/- error" in the hover template `(%{x}, %{y})`, "scatter" does.

    const traceName = name ? `Observation<br>${name}` : "Observation";
    return vectorObservations.map((observation) => {
        let hoverText = observation.label;
        let hoverData = `(%{x}, %{y})<br>`;
        if (observation.comment) {
            hoverText += `: ${observation.comment}`;
        }
        if (type === "scattergl") {
            hoverData = `(%{x}, %{y} ± ${observation.error})<br>`;
        }

        return {
            name: traceName,
            legendgroup: legendGroup,
            x: [observation.date],
            y: [observation.value],
            marker: { color: color },
            yaxis: yaxis,
            xaxis: xaxis,
            hovertemplate: hoverText ? `${hoverData}${hoverText}` : hoverData,
            showlegend: showLegend,
            type: type,
            error_y: {
                type: "constant",
                value: observation.error,
                visible: true,
            },
        };
    });
}

/**
    Utility function for creating traces representing statistical fanchart for given statistics data.

    The function creates filled transparent area between P10 and P90, and between MIN and MAX, and a free line 
    for MEAN.

    NOTE: P10 and P90, and MIN and MAX are considered to work in pairs, therefore the pairs are neglected if
    only one of the statistics in each pair is present in the data. I.e. P10/P90 is neglected if only P10 or P90
    is presented in the data. Similarly, MIN/MAX is neglected if only MIN or MAX is presented in the data.
 */
export type CreateVectorFanchartTracesOptions = {
    vectorStatisticData: VectorStatisticData_api;
    hexColor: string;
    legendGroup: string;
    name?: string;
    yaxis?: string;
    // lineShape?: "vh" | "linear" | "spline" | "hv" | "hvh" | "vhv";
    hoverTemplate?: string;
    showLegend?: boolean;
    legendRank?: number;
    type?: "scatter" | "scattergl";
};
export function createVectorFanchartTraces({
    vectorStatisticData,
    hexColor,
    legendGroup,
    name = undefined,
    yaxis = "y",
    hoverTemplate = "(%{x}, %{y})<br>",
    showLegend = false,
    type = "scatter",
    legendRank,
}: CreateVectorFanchartTracesOptions): Partial<TimeSeriesPlotData>[] {
    const lowData = vectorStatisticData.value_objects.find((v) => v.statistic_function === StatisticFunction_api.P90);
    const highData = vectorStatisticData.value_objects.find((v) => v.statistic_function === StatisticFunction_api.P10);
    let lowHighData: LowHighData | undefined = undefined;
    if (lowData && highData) {
        lowHighData = {
            highName: highData.statistic_function.toString(),
            highData: highData.values,
            lowName: lowData.statistic_function.toString(),
            lowData: lowData.values,
        };
    }

    const minData = vectorStatisticData.value_objects.find((v) => v.statistic_function === StatisticFunction_api.MIN);
    const maxData = vectorStatisticData.value_objects.find((v) => v.statistic_function === StatisticFunction_api.MAX);
    let minMaxData: MinMaxData | undefined = undefined;
    if (minData && maxData) {
        minMaxData = {
            maximum: maxData.values,
            minimum: minData.values,
        };
    }

    const meanData = vectorStatisticData.value_objects.find((v) => v.statistic_function === StatisticFunction_api.MEAN);
    let meanFreeLineData: FreeLineData | undefined = undefined;
    if (meanData) {
        meanFreeLineData = {
            name: meanData.statistic_function.toString(),
            data: meanData.values,
        };
    }

    const fanchartData: FanchartData = {
        samples: vectorStatisticData.timestamps_utc_ms,
        lowHigh: lowHighData,
        minimumMaximum: minMaxData,
        freeLine: meanFreeLineData,
    };

    return createFanchartTraces({
        data: fanchartData,
        hexColor: hexColor,
        legendGroup: legendGroup,
        name: name,
        lineShape: getLineShape(vectorStatisticData.is_rate),
        showLegend: showLegend,
        hoverTemplate: hoverTemplate,
        legendRank: legendRank,
        yaxis: yaxis,
        type: type,
    });
}

/**
    Utility function for creating traces for statistical lines for given statistics data.

    The function creates lines for P10, P50, P90, MIN, MAX, and MEAN. Solid line for MEAN, various
    dashed lines for the remaining statistics.
 */
export type CreateVectorStatisticsTracesOptions = {
    vectorStatisticData: VectorStatisticData_api;
    hexColor: string;
    legendGroup: string;
    name?: string;
    yaxis?: string;
    // lineShape?: "vh" | "linear" | "spline" | "hv" | "hvh" | "vhv";
    lineWidth?: number;
    hoverTemplate?: string;
    showLegend?: boolean;
    legendRank?: number;
    type?: "scatter" | "scattergl";
};
export function createVectorStatisticsTraces({
    vectorStatisticData,
    hexColor,
    legendGroup,
    name = undefined,
    yaxis = "y",
    lineWidth = 2,
    hoverTemplate = "(%{x}, %{y})<br>",
    showLegend = false,
    type = "scatter",
    legendRank,
}: CreateVectorStatisticsTracesOptions): Partial<TimeSeriesPlotData>[] {
    const lowValueObject = vectorStatisticData.value_objects.find(
        (v) => v.statistic_function === StatisticFunction_api.P90
    );
    const midValueObject = vectorStatisticData.value_objects.find(
        (v) => v.statistic_function === StatisticFunction_api.P50
    );
    const highValueObject = vectorStatisticData.value_objects.find(
        (v) => v.statistic_function === StatisticFunction_api.P10
    );
    const minValueObject = vectorStatisticData.value_objects.find(
        (v) => v.statistic_function === StatisticFunction_api.MIN
    );
    const maxValueObject = vectorStatisticData.value_objects.find(
        (v) => v.statistic_function === StatisticFunction_api.MAX
    );
    const meanValueObject = vectorStatisticData.value_objects.find(
        (v) => v.statistic_function === StatisticFunction_api.MEAN
    );

    const lowData: LineData | undefined = lowValueObject
        ? { data: lowValueObject.values, name: lowValueObject.statistic_function.toString() }
        : undefined;
    const midData: LineData | undefined = midValueObject
        ? { data: midValueObject.values, name: midValueObject.statistic_function.toString() }
        : undefined;
    const highData: LineData | undefined = highValueObject
        ? { data: highValueObject.values, name: highValueObject.statistic_function.toString() }
        : undefined;
    const meanData: LineData | undefined = meanValueObject
        ? { data: meanValueObject.values, name: meanValueObject.statistic_function.toString() }
        : undefined;

    const statisticsData: StatisticsData = {
        samples: vectorStatisticData.timestamps_utc_ms,
        freeLine: meanData,
        minimum: minValueObject ? minValueObject.values : undefined,
        maximum: maxValueObject ? maxValueObject.values : undefined,
        lowPercentile: lowData,
        highPercentile: highData,
        midPercentile: midData,
    };

    return createStatisticsTraces({
        data: statisticsData,
        color: hexColor,
        legendGroup: legendGroup,
        name: name,
        lineShape: getLineShape(vectorStatisticData.is_rate),
        lineWidth: lineWidth,
        showLegend: showLegend,
        hoverTemplate: hoverTemplate,
        legendRank: legendRank,
        yaxis: yaxis,
        type: type,
    });
}
