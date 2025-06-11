import type { PlotData } from "plotly.js";

import type { Size2D } from "@lib/utils/geometry";
import type { Figure } from "@modules/_shared/Figure";
import { makeSubplots } from "@modules/_shared/Figure";

import type { CorrelationMatrix, RankedParameterCorrelation } from "../../_shared/rankParameter";

export class ParameterCorrelationMatrixFigure {
    private _figure: Figure;
    private _showLabel: boolean;

    constructor(wrapperDivSize: Size2D, numCols: number, numRows: number, showLabel: boolean) {
        this._figure = makeSubplots({
            numRows: numRows,
            numCols: numCols,
            width: wrapperDivSize.width,
            height: wrapperDivSize.height,
            sharedXAxes: true,
            sharedYAxes: false,
            horizontalSpacing: 0,
            margin: {
                t: 20,
                r: 20,
                b: 200,
                l: 200,
            },
            showGrid: true,
        });
        this._figure.updateLayout({
            showlegend: false,
            font: {
                family: "Roboto, sans-serif",
                size: 12,
                color: "#333",
            },
        });

        this._showLabel = showLabel;
    }

    addCorrelationMatrixTrace(
        data: CorrelationMatrix,
        highlightedParameterString: string | null,
        rowIndex: number,
        columnIndex: number,
        cellIndex: number,
        title: string,
        color?: string,
    ) {
        const matrixTrace = createCorrelationMatrixTrace(data, highlightedParameterString, this._showLabel, color);
        const showLabels = matrixTrace.x && matrixTrace.x.length > 50 ? false : true;
        this._figure.updateLayout({
            [`xaxis${cellIndex + 1}`]: {
                showticklabels: showLabels,
                tickangle: 45,
                autosize: false,
                ticks: "",
                ticksuffix: " ",
            },
            [`yaxis${cellIndex + 1}`]: {
                showticklabels: showLabels,
                tickangle: -45,
                autosize: false,
                ticks: "",
                ticksuffix: " ",
            },
        });
        this._figure.updateSubplotTitle(`${title}`, rowIndex, columnIndex);
        this._figure.addTrace(matrixTrace, rowIndex, columnIndex);
    }

    build(handleOnClick?: ((event: Readonly<Plotly.PlotMouseEvent>) => void) | undefined): React.ReactNode {
        return this._figure.makePlot({ onClick: handleOnClick });
    }
}
type HeatMapPlotData = { hoverongaps: boolean } & Partial<PlotData>;
function createCorrelationMatrixTrace(
    matrix: CorrelationMatrix,
    highlightedParameterString: string | null,

    showLabel: boolean,
    color?: string,
): Partial<HeatMapPlotData> {
    // const identStrings = rankedParameters.map((p) => p.ident.toString());
    // const names = rankedParameters.map((p) => p.ident.name);
    // const correlations = rankedParameters.map((p) => p.correlation!);
    // const colors = identStrings.map((identString) => {
    //     if (highlightedParameterString && identString === highlightedParameterString) {
    //         return `${color}FF`;
    //     }
    //     return highlightedParameterString ? `${color}80` : `${color}FF`;
    // });
    // const lineColors = identStrings.map((identString) => {
    //     if (highlightedParameterString && identString === highlightedParameterString) {
    //         return "#000000FF";
    //     }
    //     return `${color}80`;
    // });
    const triangularMatrix = matrix.matrix.map((row, i) => {
        return row.map((val, j) => {
            return j > i ? NaN : val;
        });
    });

    const trace: Partial<HeatMapPlotData> = {
        x: matrix.labels,
        y: matrix.labels,
        z: triangularMatrix,
        type: "heatmap",
        colorscale: [
            // Custom colorscale: Blue -> White -> Red
            [0.0, "rgb(0,0,255)"], // -1.0
            [0.5, "rgb(255,255,255)"], // 0.0
            [1.0, "rgb(255,0,0)"], // +1.0
        ],
        zmin: -1,
        zmax: 1,
        showscale: true,
        hoverongaps: false,
    };

    return trace;
}
