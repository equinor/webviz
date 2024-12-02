import {
    RelPermStatisticalDataForSaturation_api,
    Statistic_api,
    StatisticalCurveData_api,
    SummaryVectorDateObservation_api,
    VectorHistoricalData_api,
    VectorRealizationData_api,
    VectorStatisticData_api,
} from "@api";
import {
    FanchartData,
    FreeLineData,
    LowHighData,
    MinMaxData,
    createFanchartTraces,
} from "@modules/_shared/PlotlyTraceUtils/fanchartPlotting";
import { LineData, StatisticsData, createStatisticsTraces } from "@modules/_shared/PlotlyTraceUtils/statisticsPlotting";
import { PlotDataWithLegendRank } from "@modules/_shared/PlotlyTraceUtils/types";

import { PlotData } from "plotly.js";

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
}: CreateVectorRealizationTraceOptions): Partial<PlotDataWithLegendRank> {
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
    } as Partial<PlotDataWithLegendRank>;
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
}: CreateVectorRealizationTracesOptions): Partial<PlotDataWithLegendRank>[] {
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
    Utility function for creating traces representing statistical fanchart for given statistics data.

    The function creates filled transparent area between P10 and P90, and between MIN and MAX, and a free line 
    for MEAN.

    NOTE: P10 and P90, and MIN and MAX are considered to work in pairs, therefore the pairs are neglected if
    only one of the statistics in each pair is present in the data. I.e. P10/P90 is neglected if only P10 or P90
    is presented in the data. Similarly, MIN/MAX is neglected if only MIN or MAX is presented in the data.
 */
export type CreateRelPermFanchartTracesOptions = {
    relPermStatisticsData: RelPermStatisticalDataForSaturation_api;
    curveName: string;
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
export function createRelPermFanchartTraces({
    relPermStatisticsData,
    curveName,
    hexColor,
    legendGroup,
    name = undefined,
    yaxis = "y",
    hoverTemplate = "(%{x}, %{y})<br>",
    showLegend = false,
    type = "scatter",
    legendRank,
}: CreateRelPermFanchartTracesOptions): Partial<PlotData>[] {
    const curveData = relPermStatisticsData.relperm_curve_data.find((v) => v.curve_name === curveName);
    if (!curveData) {
        throw new Error(`Curve data for curve name ${curveName} not found in rel perm statistics data`);
    }
    const lowData = curveData.curve_values[Statistic_api.P90];
    const highData = curveData.curve_values[Statistic_api.P10];

    let lowHighData: LowHighData | undefined = undefined;
    if (lowData && highData) {
        lowHighData = {
            highName: Statistic_api.P10.toString(),
            highData: highData,
            lowName: Statistic_api.P90.toString(),
            lowData: lowData,
        };
    }

    const minData = curveData.curve_values[Statistic_api.MIN];
    const maxData = curveData.curve_values[Statistic_api.MAX];

    let minMaxData: MinMaxData | undefined = undefined;
    if (minData && maxData) {
        minMaxData = {
            maximum: maxData,
            minimum: minData,
        };
    }

    const meanData = curveData.curve_values[Statistic_api.MEAN];
    let meanFreeLineData: FreeLineData | undefined = undefined;
    if (meanData) {
        meanFreeLineData = {
            name: Statistic_api.MEAN.toString(),
            data: meanData,
        };
    }

    const fanchartData: FanchartData = {
        samples: relPermStatisticsData.saturation_axis_data.curve_values,
        lowHigh: lowHighData,
        minimumMaximum: minMaxData,
        freeLine: meanFreeLineData,
    };

    return createFanchartTraces({
        data: fanchartData,
        hexColor: hexColor,
        legendGroup: legendGroup,
        name: name,
        lineShape: "linear", //getLineShape(relPermStatisticsData.is_rate),
        showLegend: showLegend,
        hoverTemplate: hoverTemplate,
        legendRank: legendRank,
        yaxis: yaxis,
        type: type,
    });
}
