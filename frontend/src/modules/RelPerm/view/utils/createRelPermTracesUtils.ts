import type { PlotData } from "plotly.js";

import type { StatisticalCurveData_api } from "@api";
import type {
    FanchartData,
    FreeLineData,
    LowHighData,
    MinMaxData} from "@modules/_shared/plotly/PlotlyTraceUtils/fanchartPlotting";
import {
    createFanchartTraces
} from "@modules/_shared/plotly/PlotlyTraceUtils/fanchartPlotting";

export type createRelPermRealizationTraceOptions = {
    hoverLabel: string;
    saturationValues: number[];
    curveValues: number[];
    useGl: boolean;

    hexColor: string;
    showLegend: boolean;
    legendGroupTitle: string;
    legendGroup: string;
    name: string;
};
export function createRelPermRealizationTrace({
    hoverLabel,
    saturationValues,
    curveValues,
    useGl,
    hexColor,
    showLegend,
    name,
    legendGroupTitle,
    legendGroup,
}: createRelPermRealizationTraceOptions): Partial<PlotData> {
    const trace: Partial<PlotData> = {
        x: saturationValues,
        y: curveValues,
        type: useGl ? "scattergl" : "scatter",
        mode: "lines",
        showlegend: showLegend,
        legendgrouptitle: { text: legendGroupTitle },
        legendgroup: legendGroup,
        name,
        marker: {
            color: hexColor,
        },
        hovertext: hoverLabel,
    };

    return trace;
}

export function createRelPermRealizationTraceHovertext(
    ensembleName: string,
    satNum: string,
    curveName: string,
    realization: number,
): string {
    return `${ensembleName} </br>Satnum: ${satNum} </br>Curve: ${curveName} </br>Realization: <b>${realization}</b>`;
}
export function createRelPermFanchartHovertext(
    ensembleName: string,
    satNum: string,
    curveName: string,
    saturationName: string,
    
): string {
    return`${curveName}: <b>%{y}</b><br>${saturationName}: <b>%{x}</b></br>Satnum: <b>${satNum}</b></br>Ensemble: <b>${ensembleName}</b><extra></extra>`;
}
export function createRelPermFanchartTraces(
    curveData: StatisticalCurveData_api,
    saturationCurveValues: number[],
    hexColor: string,
    hoverTemplate:string,
    name: string | null,
    legendGroup: string,
    showLegend: boolean,
): Partial<PlotData>[] {
    const lowData = curveData.p90_values;
    const highData = curveData.p10_values;
    let lowHighData: LowHighData | undefined = undefined;
    if (lowData && highData) {
        lowHighData = {
            highName: "P10",
            highData: highData,
            lowName: "P90",
            lowData: lowData,
        };
    }

    const minData = curveData.min_values;
    const maxData = curveData.max_values;
    let minMaxData: MinMaxData | undefined = undefined;
    if (minData && maxData) {
        minMaxData = {
            maximum: maxData,
            minimum: minData,
        };
    }

    const meanData = curveData.mean_values;
    let meanFreeLineData: FreeLineData | undefined = undefined;
    if (meanData) {
        meanFreeLineData = {
            name: "Mean",
            data: meanData,
        };
    }

    const fanchartData: FanchartData = {
        samples: saturationCurveValues,
        lowHigh: lowHighData,
        minimumMaximum: minMaxData,
        freeLine: meanFreeLineData,
    };

    return createFanchartTraces({
        data: fanchartData,
        hexColor: hexColor,
        legendGroup: legendGroup,
        name: name ?? legendGroup,
        lineShape: "linear",
        showLegend: showLegend,
        hoverTemplate:  hoverTemplate,
        legendRank: 1,
        yaxis: "y",
        xaxis: "x",
        type: "scatter",
    });
}
