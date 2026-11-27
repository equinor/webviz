import type { Layout, ScatterData } from "plotly.js";

import type { Size2D } from "@lib/utils/geometry";
import type { Figure } from "@modules/_shared/Figure";
import { makeSubplots } from "@modules/_shared/Figure";
import { linearRegression } from "@modules/_shared/utils/math/linearRegression";

export class ScatterPlotParameterResponseFigure {
    private _figure: Figure;
    private _showTrendline: boolean;

    constructor(wrapperDivSize: Size2D, numCols: number, numRows: number, showTrendline: boolean) {
        this._figure = makeSubplots({
            numRows,
            numCols,
            width: wrapperDivSize.width,
            height: wrapperDivSize.height,
            sharedXAxes: false,
            sharedYAxes: false,
            horizontalSpacing: 0.2 / numCols,
            margin: {
                t: 20,
                r: 20,
                b: 20,
                l: 40,
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
        this._showTrendline = showTrendline;
    }
    addSubplot(
        data: scatterPlotParameterResponseData,
        row: number,
        column: number,
        cellIndex: number,
        traceTitle: string,
    ) {
        const scatterTrace = createPlotlyParameterResponseScatterTrace(data);

        this._figure.addTrace(scatterTrace, row, column);

        // Log scale is only possible when all parameter values are positive
        const useLogX = data.parameterIsLogarithmic && data.parameterValues.every((v) => v > 0);

        if (this._showTrendline) {
            const { responseValues, parameterValues } = data;
            const trendLineTrace = createPlotlyTrendLineTrace(parameterValues, responseValues, useLogX);
            this._figure.addTrace(trendLineTrace, row, column);
        }
        this._figure.updateSubplotTitle(`${traceTitle}`, row, column);
        this.setAxisSettings(cellIndex, useLogX);
    }
    private setAxisSettings(cellIndex: number, useLogX: boolean) {
        const xAxisKey = `xaxis${cellIndex}` as const;
        const yAxisKey = `yaxis${cellIndex}` as const;
        const layoutPatch: Partial<Layout> = {};
        layoutPatch[xAxisKey] = {
            zeroline: false,
            type: useLogX ? "log" : "linear",
            exponentformat: "power",
        };
        layoutPatch[yAxisKey] = { zeroline: false, exponentformat: "power" };
        this._figure.updateLayout(layoutPatch);
    }

    makePlotData() {
        return this._figure.makeData();
    }
    makePlotLayout() {
        return this._figure.makeLayout();
    }
}
export type scatterPlotParameterResponseData = {
    responseValues: number[];
    parameterValues: number[];
    realizationValues: number[];
    parameterName: string;
    parameterIsLogarithmic: boolean;
    responseName: string;
    color: string;
};

function createPlotlyParameterResponseScatterTrace(data: scatterPlotParameterResponseData): Partial<ScatterData> {
    const markerColor = `${data.color}80`;
    const lineColor = `${data.color}FF`;

    const { responseValues, parameterValues, realizationValues, parameterName, responseName } = data;
    const scatterTrace: Partial<ScatterData> = {
        x: parameterValues,
        y: responseValues,
        mode: "markers",
        type: "scatter",
        marker: {
            symbol: "circle",
            size: 10,
            color: markerColor,
            opacity: 1,
            line: {
                color: lineColor,
                width: 1,
            },
        },

        hovertemplate: `${parameterName} = <b>%{x}</b> <br> ${responseName} = <b>%{y}</b> <br> Realization = <b>%{text}</b> <extra></extra>`,
        hoverlabel: {
            bgcolor: "white",
            font: { size: 12, color: "black" },
        },
        text: realizationValues.map((realization) => realization.toString()),
    };
    return scatterTrace;
}
function createPlotlyTrendLineTrace(xValues: number[], yValues: number[], useLogX: boolean): Partial<ScatterData> {
    // On a log axis, fit against log10(x) so the trendline is straight in the displayed space
    const transform = useLogX ? Math.log10 : (x: number) => x;
    const { slope, intercept } = linearRegression(xValues.map(transform), yValues);
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const trendlineX = [minX, maxX];
    const trendlineY = [intercept + slope * transform(minX), intercept + slope * transform(maxX)];
    return {
        x: trendlineX,
        y: trendlineY,
        mode: "lines",
        type: "scatter",
        name: "Linear Trendline",
        line: {
            color: "black",
            dash: "dash",
            width: 2,
        },
    };
}
