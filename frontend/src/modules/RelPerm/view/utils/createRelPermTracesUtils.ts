import { StatisticalCurveData_api } from "@api";
import {
    createFanchartTraces,
    FanchartData,
    FreeLineData,
    LowHighData,
    MinMaxData,
} from "@modules/_shared/plotly/PlotlyTraceUtils/fanchartPlotting";
import { formatRgb, type Rgb } from "culori";
import type { PlotData } from "plotly.js";

export type createRelPermRealizationTraceOptions = {
    hoverLabel: string;
    saturationValues: number[];
    curveValues: number[];
    useGl: boolean;
    opacity: number;
    lineWidth: number;
    rgbColor: Rgb;
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
    opacity,
    lineWidth,
    rgbColor,
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
        line: {
            width: lineWidth,
        },
        legendgrouptitle: { text: legendGroupTitle },
        legendgroup: legendGroup,
        name,
        marker: {
            color: `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, ${opacity})`,
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

export function createRelPermFanchartTraces(
    curveData: StatisticalCurveData_api,
    saturationCurveValues: number[],
    rgbColor: Rgb,
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
        //red hex
        hexColor: formatRgb(rgbColor),
        legendGroup: legendGroup,
        name: name ?? legendGroup,
        lineShape: "linear",
        showLegend: showLegend,
        hoverTemplate: "",
        legendRank: 1,
        yaxis: "y",
        xaxis: "x",
        type: "scatter",
    });
}
