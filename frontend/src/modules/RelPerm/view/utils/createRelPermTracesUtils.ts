import { Rgb } from "culori";
import { PlotData } from "plotly.js";

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
