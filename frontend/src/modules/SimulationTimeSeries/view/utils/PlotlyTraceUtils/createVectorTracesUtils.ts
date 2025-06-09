import type {
    SummaryVectorDateObservation_api,
    VectorHistoricalData_api,
    VectorRealizationData_api,
    VectorStatisticData_api,
} from "@api";
import { DerivedVectorType_api, StatisticFunction_api } from "@api";

import type { PlotData } from "plotly.js";

import type {
    FanchartData,
    FreeLineData,
    LowHighData,
    MinMaxData,
} from "@modules/_shared/plotly/PlotlyTraceUtils/fanchartPlotting";
import { createFanchartTraces } from "@modules/_shared/plotly/PlotlyTraceUtils/fanchartPlotting";
import type { LineData, StatisticsData } from "@modules/_shared/plotly/PlotlyTraceUtils/statisticsPlotting";
import { createStatisticsTraces } from "@modules/_shared/plotly/PlotlyTraceUtils/statisticsPlotting";

function isDerivedVectorOfType(
    vectorData: VectorRealizationData_api | VectorStatisticData_api | VectorHistoricalData_api,
    type: DerivedVectorType_api,
): boolean {
    return "derivedVectorInfo" in vectorData && vectorData.derivedVectorInfo?.type === type;
}

/**
 * Utility function for getting the shape of the trace line for given vector data.
 *
 * Default is "linear", rate vectors are "vh", and custom calculated vectors are "hv".
 */
export function getTraceLineShape(
    vectorData: VectorRealizationData_api | VectorStatisticData_api | VectorHistoricalData_api,
): "linear" | "hv" | "vh" {
    if (
        isDerivedVectorOfType(vectorData, DerivedVectorType_api.PER_DAY) ||
        isDerivedVectorOfType(vectorData, DerivedVectorType_api.PER_INTVL)
    ) {
        // Custom calculated vectors valid forward in time
        return "hv";
    }
    if (vectorData.isRate) {
        // Rate vectors are valid backward in time
        return "vh";
    }
    return "linear";
}

/**
    Definition of base options for creating vector realization trace for a vector realization data.
 */
type CreateRealizationTraceBaseOptions = {
    name?: string;
    color: string;
    legendGroup: string;
    hoverTemplate?: string;
    lineShape?: "linear" | "spline" | "hv" | "vh" | "hvh" | "vhv";
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
    lineShape = "linear",
    showLegend = false,
    yaxis = "y",
    xaxis = "x",
    type = "scatter",
}: CreateVectorRealizationTraceOptions): Partial<PlotData> {
    // TODO:
    // - type: "scattergl" or "scatter"? Maximum 8 WebGL contexts in Chrome gives issues?
    //         "scattergl" hides traces when zooming and panning for Ruben on work computer.

    return {
        x: vectorRealizationData.timestampsUtcMs,
        y: vectorRealizationData.values,
        line: { width: 1, color: color, shape: lineShape },
        mode: "lines",
        type: type,
        hovertemplate: `${hoverTemplate}Realization: ${vectorRealizationData.realization}`,
        name: name,
        legendgroup: legendGroup,
        showlegend: vectorRealizationData.realization === 0 && showLegend ? true : false,
        yaxis: yaxis,
        xaxis: xaxis,
    } as Partial<PlotData>;
}

/**
    Utility function for creating vector realization traces for an array of vector realization data
    for given vector.
 */
export type CreateVectorRealizationTracesOptions = CreateRealizationTraceBaseOptions & {
    vectorRealizationsData: VectorRealizationData_api[];
};
export function createVectorRealizationTraces({
    vectorRealizationsData: vectorRealizationDataArray,
    name,
    color,
    legendGroup,
    hoverTemplate = "",
    lineShape = "linear",
    showLegend = false,
    yaxis = "y",
    xaxis = "x",
    type = "scatter",
}: CreateVectorRealizationTracesOptions): Partial<PlotData>[] {
    return vectorRealizationDataArray.map((realization) => {
        return createVectorRealizationTrace({
            vectorRealizationData: realization,
            name,
            color,
            legendGroup,
            hoverTemplate,
            lineShape,
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
    lineShape?: "linear" | "spline" | "hv" | "vh" | "hvh" | "vhv";
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
    lineShape = "linear",
    name: name,
    legendRank,
}: CreateHistoricalVectorTraceOptions): Partial<PlotData> {
    const hoverText = name ? `History: ${name}` : "History";
    return {
        line: { shape: lineShape, color: color },
        mode: "lines",
        type: type,
        x: vectorHistoricalData.timestampsUtcMs,
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
}: CreateVectorObservationTraceOptions): Partial<PlotData>[] {
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
    xaxis?: string;
    lineShape?: "vh" | "linear" | "spline" | "hv" | "hvh" | "vhv";
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
    xaxis = "x",
    lineShape = "linear",
    hoverTemplate = "(%{x}, %{y})<br>",
    showLegend = false,
    type = "scatter",
    legendRank,
}: CreateVectorFanchartTracesOptions): Partial<PlotData>[] {
    const lowData = vectorStatisticData.valueObjects.find((v) => v.statisticFunction === StatisticFunction_api.P90);
    const highData = vectorStatisticData.valueObjects.find((v) => v.statisticFunction === StatisticFunction_api.P10);
    let lowHighData: LowHighData | undefined = undefined;
    if (lowData && highData) {
        lowHighData = {
            highName: highData.statisticFunction.toString(),
            highData: highData.values,
            lowName: lowData.statisticFunction.toString(),
            lowData: lowData.values,
        };
    }

    const minData = vectorStatisticData.valueObjects.find((v) => v.statisticFunction === StatisticFunction_api.MIN);
    const maxData = vectorStatisticData.valueObjects.find((v) => v.statisticFunction === StatisticFunction_api.MAX);
    let minMaxData: MinMaxData | undefined = undefined;
    if (minData && maxData) {
        minMaxData = {
            maximum: maxData.values,
            minimum: minData.values,
        };
    }

    const meanData = vectorStatisticData.valueObjects.find((v) => v.statisticFunction === StatisticFunction_api.MEAN);
    let meanFreeLineData: FreeLineData | undefined = undefined;
    if (meanData) {
        meanFreeLineData = {
            name: meanData.statisticFunction.toString(),
            data: meanData.values,
        };
    }

    const fanchartData: FanchartData = {
        samples: vectorStatisticData.timestampsUtcMs,
        lowHigh: lowHighData,
        minimumMaximum: minMaxData,
        freeLine: meanFreeLineData,
    };

    return createFanchartTraces({
        data: fanchartData,
        hexColor: hexColor,
        legendGroup: legendGroup,
        name: name,
        lineShape: lineShape,
        showLegend: showLegend,
        hoverTemplate: hoverTemplate,
        legendRank: legendRank,
        yaxis: yaxis,
        xaxis: xaxis,
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
    xaxis?: string;
    lineShape?: "vh" | "linear" | "spline" | "hv" | "hvh" | "vhv";
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
    xaxis = "x",
    lineShape = "linear",
    lineWidth = 2,
    hoverTemplate = "(%{x}, %{y})<br>",
    showLegend = false,
    type = "scatter",
    legendRank,
}: CreateVectorStatisticsTracesOptions): Partial<PlotData>[] {
    const lowData = getVectorStatisticLineDataForFunction(vectorStatisticData, StatisticFunction_api.P90);
    const midData = getVectorStatisticLineDataForFunction(vectorStatisticData, StatisticFunction_api.P50);
    const highData = getVectorStatisticLineDataForFunction(vectorStatisticData, StatisticFunction_api.P10);
    const minData = getVectorStatisticLineDataForFunction(vectorStatisticData, StatisticFunction_api.MIN);
    const maxData = getVectorStatisticLineDataForFunction(vectorStatisticData, StatisticFunction_api.MAX);
    const meanData = getVectorStatisticLineDataForFunction(vectorStatisticData, StatisticFunction_api.MEAN);

    const statisticsData: StatisticsData = {
        samples: vectorStatisticData.timestampsUtcMs,
        freeLine: meanData,
        minimum: minData ? minData.data : undefined,
        maximum: maxData ? maxData.data : undefined,
        lowPercentile: lowData,
        highPercentile: highData,
        midPercentile: midData,
    };

    return createStatisticsTraces({
        data: statisticsData,
        color: hexColor,
        legendGroup: legendGroup,
        name: name,
        lineShape: lineShape,
        lineWidth: lineWidth,
        showLegend: showLegend,
        hoverTemplate: hoverTemplate,
        legendRank: legendRank,
        yaxis: yaxis,
        xaxis: xaxis,
        type: type,
    });
}

function getVectorStatisticLineDataForFunction(
    vectorStatisticData: VectorStatisticData_api,
    statisticFunction: StatisticFunction_api,
): LineData | undefined {
    const valueObject = vectorStatisticData.valueObjects.find((v) => v.statisticFunction === statisticFunction);

    if (!valueObject) {
        return undefined;
    }

    return {
        data: valueObject.values,
        name: statisticFunction.toString(),
    };
}
