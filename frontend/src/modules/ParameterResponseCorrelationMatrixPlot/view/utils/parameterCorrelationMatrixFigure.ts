import type { Size2D } from "@lib/utils/geometry";
import type { Figure } from "@modules/_shared/Figure";
import { makeSubplots } from "@modules/_shared/Figure";
import type { CorrelationMatrix } from "@modules/_shared/utils/math/correlationMatrix";

import { createCorrelationMatrixTrace } from "./parameterCorrelationMatrixTraces";

export type CorrelationMatrixTraceProps = {
    data: CorrelationMatrix;
    colorScaleWithGradient: [number, string][];
    row: number;
    column: number;
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

    addFullCorrelationMatrixTrace({
        data,
        colorScaleWithGradient,
        row,
        column,
        cellIndex,
        title,
    }: CorrelationMatrixTraceProps): void {
        const matrixTrace = createCorrelationMatrixTrace(
            data,
            colorScaleWithGradient,
            this._showSelfCorrelation,
            this._useFixedColorRange,
        );

        this._figure.updateSubplotTitle(`${title}`, row, column);
        this._figure.addTrace(matrixTrace, row, column);
        this.setAxisSettings(cellIndex);
    }
    addParameterResponseMatrixTrace({
        data,
        colorScaleWithGradient,
        row,
        column,
        cellIndex,
        title,
    }: CorrelationMatrixTraceProps): void {
        const matrixTrace = createCorrelationMatrixTrace(data, colorScaleWithGradient, false, this._useFixedColorRange);

        this._figure.updateSubplotTitle(`${title}`, row, column);
        this._figure.addTrace(matrixTrace, row, column);
        this.setAxisSettings(cellIndex);
    }
    private setAxisSettings(cellIndex: number): void {
        this._figure.updateLayout({
            [`xaxis${cellIndex + 1}`]: {
                showticklabels: this._showLabels,
                tickangle: 45,
                autosize: false,
                ticks: "",
                ticksuffix: " ",
                spikemode: "across",
                spikesnap: "data",
                spikethickness: 1,
                spikedash: "line",
                spikecolor: "black",
            },
            [`yaxis${cellIndex + 1}`]: {
                showticklabels: this._showLabels,
                tickangle: -45,
                autosize: false,
                ticks: "",
                ticksuffix: " ",
                showspikes: true,
                spikemode: "across",
                spikesnap: "data",
                spikethickness: 1,
                spikedash: "line",
                spikecolor: "black",
            },
        });
    }
    build(handleOnClick?: ((event: Readonly<Plotly.PlotMouseEvent>) => void) | undefined): React.ReactNode {
        return this._figure.makePlot({ onClick: handleOnClick });
    }
}
