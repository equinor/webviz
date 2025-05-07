import {
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
        x: vectorRealizationData.timestampsUtcMs,
        y: vectorRealizationData.values,
        line: { width: 1, color: color, shape: getLineShape(vectorRealizationData.isRate) },
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
