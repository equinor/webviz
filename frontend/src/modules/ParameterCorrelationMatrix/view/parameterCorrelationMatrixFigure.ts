import type { PlotData } from "plotly.js";

import type { Size2D } from "@lib/utils/geometry";
import type { Figure } from "@modules/_shared/Figure";
import { makeSubplots } from "@modules/_shared/Figure";

import type { CorrelationMatrix } from "../../_shared/rankParameter";

export type CorrelationMatrixTraceProps = {
    data: CorrelationMatrix;
    rowIndex: number;
    columnIndex: number;
    cellIndex: number;
    title: string;
};
export type ParameterCorrelationMatrixFigureProps = {
    wrapperDivSize: Size2D;
    numCols: number;
    numRows: number;
    showLabels: boolean;
    showSelfCorrelation: boolean;
    useFixedColorRange: boolean;
};
export class ParameterCorrelationMatrixFigure {
    private _figure: Figure;
    private _showLabels: boolean;
    private _showSelfCorrelation: boolean;
    private _useFixedColorRange: boolean;

    constructor({
        wrapperDivSize,
        numCols,
        numRows,
        showLabels,
        showSelfCorrelation,
        useFixedColorRange,
    }: ParameterCorrelationMatrixFigureProps) {
        this._showLabels = showLabels;
        this._showSelfCorrelation = showSelfCorrelation;
        this._useFixedColorRange = useFixedColorRange;
        const margin = this._showLabels
            ? {
                  t: 20,
                  r: 20,
                  b: 200,
                  l: 200,
              }
            : {
                  t: 20,
                  r: 20,
                  b: 20,
                  l: 20,
              };
        this._figure = makeSubplots({
            numRows: numRows,
            numCols: numCols,
            width: wrapperDivSize.width,
            height: wrapperDivSize.height,
            sharedXAxes: true,
            sharedYAxes: false,
            horizontalSpacing: 0,
            margin: margin,
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
    }

    addCorrelationMatrixTrace({ data, rowIndex, columnIndex, cellIndex, title }: CorrelationMatrixTraceProps): void {
        const matrixTrace = createCorrelationMatrixTrace(data, this._showSelfCorrelation, this._useFixedColorRange);
        this._figure.updateLayout({
            [`xaxis${cellIndex + 1}`]: {
                showticklabels: this._showLabels,
                tickangle: 45,
                autosize: false,
                ticks: "",
                ticksuffix: " ",
            },
            [`yaxis${cellIndex + 1}`]: {
                showticklabels: this._showLabels,
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
    showSelfCorrelation: boolean,
    useFixedColorRange: boolean,
): Partial<HeatMapPlotData> {
    const triangularMatrix = matrix.matrix.map((row, i) => {
        if (!showSelfCorrelation) {
            return row.map((val, j) => {
                return j >= i ? NaN : val;
            });
        } else {
            return row.map((val, j) => {
                return j > i ? NaN : val;
            });
        }
    });

    const trace: Partial<HeatMapPlotData> = {
        x: matrix.labels,
        y: matrix.labels,
        z: triangularMatrix,
        type: "heatmap",
        colorscale: [
            [0.0, "rgb(0,0,255)"], // -1.0
            [0.5, "rgb(255,255,255)"], // 0.0
            [1.0, "rgb(255,0,0)"], // +1.0
        ],
        zmin: useFixedColorRange ? -1 : undefined,
        zmax: useFixedColorRange ? 1 : undefined,
        showscale: true,
        hoverongaps: false,
    };

    return trace;
}
