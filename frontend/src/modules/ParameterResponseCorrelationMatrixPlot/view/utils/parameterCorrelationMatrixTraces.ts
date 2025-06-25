import type { CorrelationMatrix } from "@modules/_shared/utils/math/correlationMatrix";
import type { PlotData } from "plotly.js";

type HeatMapPlotData = { hoverongaps: boolean } & Partial<PlotData>;

export function createCorrelationMatrixTrace(
    matrix: CorrelationMatrix,
    colorScaleWithGradient: [number, string][],
    showSelfCorrelation: boolean,
    useFixedColorRange: boolean,
): Partial<HeatMapPlotData> {
    const triangularMatrix = matrix.matrix.map((row, i) => {
        return row.map((val, j) => {
            const includeValue = showSelfCorrelation ? j <= i : j < i;
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

    return trace;
}
