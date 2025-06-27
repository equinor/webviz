import type { Size2D } from "@lib/utils/geometry";
import type { Figure } from "@modules/_shared/Figure";
import { makeSubplots } from "@modules/_shared/Figure";
import type { CorrelationMatrix } from "@modules/_shared/utils/math/correlationMatrix";
import { PlotType } from "@modules/ParameterResponseCorrelationMatrixPlot/typesAndEnums";

import {
    createFullCorrelationMatrixTrace,
    createTriangularCorrelationMatrixTrace,
} from "./parameterCorrelationMatrixTraces";

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
    plotType: PlotType;
    numCols: number;
    numRows: number;
    showLabels: boolean;
    useFixedColorRange: boolean;
};
export class ParameterCorrelationMatrixFigure {
    private _figure: Figure;
    private _showLabels: boolean;
    private _useFixedColorRange: boolean;
    private _plotType: PlotType;

    constructor({
        wrapperDivSize,
        plotType,
        numCols,
        numRows,
        showLabels,
        useFixedColorRange,
    }: ParameterCorrelationMatrixFigureProps) {
        this._showLabels = showLabels;
        this._useFixedColorRange = useFixedColorRange;
        this._plotType = plotType;
        this._figure = makeSubplots({
            numRows: numRows,
            numCols: numCols,
            width: wrapperDivSize.width,
            height: wrapperDivSize.height,
            sharedXAxes: true,
            sharedYAxes: false,
            horizontalSpacing: 0,
            showGrid: true,
        });
        this.setPlotMargin();
        this._figure.updateLayout({
            showlegend: false,
            font: {
                family: "Roboto, sans-serif",
                size: 12,
                color: "#333",
            },
        });
    }
    numRows(): number {
        return this._figure.getNumRows();
    }

    numColumns(): number {
        return this._figure.getNumColumns();
    }
    private setPlotMargin(): void {
        const margin = {
            t: 20,
            r: 20,
            b: 20,
            l: 20,
        };
        // Always show response labels
        if (this._plotType === PlotType.ParameterResponseMatrix) {
            margin.l = 200;
        }
        if (this._showLabels) {
            margin.l = 200;
            margin.b = 200;
        }
        this._figure.updateLayout({
            margin: margin,
        });
    }
    addFullTriangularCorrelationMatrixTrace({
        data,
        colorScaleWithGradient,
        row,
        column,
        cellIndex,
        title,
    }: CorrelationMatrixTraceProps): void {
        const matrixTrace = createTriangularCorrelationMatrixTrace(
            data,
            colorScaleWithGradient,
            this._useFixedColorRange,
        );

        this._figure.updateSubplotTitle(`${title}`, row, column);
        this._figure.addTrace(matrixTrace, row, column);
        this.setAxisSettings(cellIndex);
    }
    addFullMirroredCorrelationMatrixTrace({
        data,
        colorScaleWithGradient,
        row,
        column,
        cellIndex,
        title,
    }: CorrelationMatrixTraceProps): void {
        const matrixTrace = createFullCorrelationMatrixTrace(data, colorScaleWithGradient, this._useFixedColorRange);

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
        const matrixTrace = createFullCorrelationMatrixTrace(data, colorScaleWithGradient, this._useFixedColorRange);

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
                showgrid: false,
                zeroline: false,
            },
            [`yaxis${cellIndex + 1}`]: {
                showticklabels: this._showLabels || this._plotType === PlotType.ParameterResponseMatrix,
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
                showgrid: false,
                zeroline: false,
            },
        });
    }
    build(handleOnClick?: ((event: Readonly<Plotly.PlotMouseEvent>) => void) | undefined): React.ReactNode {
        return this._figure.makePlot({ onClick: handleOnClick });
    }
}
