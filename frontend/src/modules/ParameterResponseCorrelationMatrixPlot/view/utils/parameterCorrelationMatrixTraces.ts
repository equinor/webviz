import type { PlotData } from "plotly.js";

import type { CorrelationMatrix } from "@modules/_shared/utils/math/correlationMatrix";

type HeatMapPlotData = Partial<PlotData> & { hoverongaps: boolean };

export function createTriangularCorrelationMatrixTrace(
    matrix: CorrelationMatrix,
    colorScaleWithGradient: [number, string][],
    useFixedColorRange: boolean,
): Partial<HeatMapPlotData> {
    const triangularMatrix = matrix.matrix.map((row, i) => {
        return row.map((val, j) => {
            const includeValue = j <= i;
            return includeValue ? val : NaN;
        });
    });

    const trace: Partial<HeatMapPlotData> = {
        x: matrix.xLabels,
        y: matrix.yLabels,
        z: triangularMatrix,
        type: "heatmap",
        colorscale: colorScaleWithGradient,
        zmin: useFixedColorRange ? -1 : undefined,
        zmax: useFixedColorRange ? 1 : undefined,
        showscale: true,
        hoverongaps: false,
        hovertemplate: "X-axis = <b>%{x}</b><br>Y-axis = <b>%{y}</b><br>Correlation = <b>%{z}</b><extra></extra>",
        hoverlabel: {
            bgcolor: "white",
            font: { size: 12, color: "black" },
        },
    };

    const showText = matrix.xLabels.length <= 30 && matrix.yLabels.length <= 30; // Show labels only if the matrix is small enough

    if (showText) {
        const textMatrix = triangularMatrix.map((row) =>
            row.map((value) => (value !== null && !isNaN(value) ? value.toFixed(2) : "")),
        );
        trace.text = textMatrix as any;
        trace.texttemplate = "%{text}";
        trace.textfont = { size: 10, color: "black" };
        trace.textposition = "middle center";
    }
    return trace;
}
export function createFullCorrelationMatrixTrace(
    matrix: CorrelationMatrix,
    colorScaleWithGradient: [number, string][],
    useFixedColorRange: boolean,
): Partial<HeatMapPlotData> {
    const trace: Partial<HeatMapPlotData> = {
        x: matrix.xLabels,
        y: matrix.yLabels,
        z: matrix.matrix,
        type: "heatmap",
        colorscale: colorScaleWithGradient,
        zmin: useFixedColorRange ? -1 : undefined,
        zmax: useFixedColorRange ? 1 : undefined,
        showscale: true,
        hoverongaps: false,
        hovertemplate: "X-axis = <b>%{x}</b><br>Y-axis = <b>%{y}</b><br>Correlation = <b>%{z}</b><extra></extra>",
        hoverlabel: {
            bgcolor: "white",
            font: { size: 12, color: "black" },
        },
    };
    const showText = matrix.xLabels.length <= 30 && matrix.yLabels.length <= 30; // Show labels only if the matrix is small enough

    if (showText) {
        const textMatrix = matrix.matrix.map((row) => row.map((value) => (value !== null ? value.toFixed(2) : "")));
        trace.text = textMatrix as any;
        trace.texttemplate = "%{text}";
        trace.textfont = { size: 10, color: "black" };
        trace.textposition = "middle center";
    }

    return trace;
}
