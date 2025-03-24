import { EnsembleIdentWithRealizations } from "@modules/_shared/InplaceVolumetrics/queryHooks";

import { Rgb } from "culori";
import { PlotData } from "plotly.js";

export function createRelPermRealizationTrace(
    hoverLabel: string,
    saturationValues: number[],
    curveValues: number[],
    useGl: boolean,
    opacity: number,
    lineWidth: number,
    rgbColor: Rgb,
): Partial<PlotData> {
    const trace: Partial<PlotData> = {
        x: saturationValues,
        y: curveValues,

        type: useGl ? "scattergl" : "scatter",
        mode: "lines",
        showlegend: false,
        line: {
            width: lineWidth,
        },
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
