import { Size2D } from "@lib/utils/geometry";
import { Figure, makeSubplots } from "@modules/_shared/Figure";
import { linearRegression } from "@modules/_shared/utils/math/linearRegression";
import type { Layout, PlotData } from "plotly.js";

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
        });
        this._showTrendline = showTrendline;
    }
    addSubplot(
        data: scatterPlotParameterResponseData,
        rowIndex: number,
        colIndex: number,
        cellIndex: number,
        traceTitle: string
    ) {
        const scatterTrace = createPlotlyParameterResponseScatterTrace(data);

        this._figure.addTrace(scatterTrace, rowIndex, colIndex);

        if (this._showTrendline) {
            const { responseValues, parameterValues } = data;
            const trendLineTrace = createPlotlyTrendLineTrace(parameterValues, responseValues);
            this._figure.addTrace(trendLineTrace, rowIndex, colIndex);
        }
        this._figure.updateSubplotTitle(`${traceTitle}`, rowIndex, colIndex);
        this.setAxisSettings(cellIndex);
    }
    private setAxisSettings(cellIndex: number) {
        const layoutPatch: Partial<Layout> = {
            [`xaxis${cellIndex}`]: {
                zeroline: false,
            },
            [`yaxis${cellIndex}`]: {
                zeroline: false,
            },
        };
        this._figure.updateLayout(layoutPatch);
    }
    build() {
        return this._figure.makePlot();
    }
}
export type scatterPlotParameterResponseData = {
    responseValues: number[];
    parameterValues: number[];
    realizationValues: number[];
    parameterName: string;
    responseName: string;
};

function createPlotlyParameterResponseScatterTrace(data: scatterPlotParameterResponseData): Partial<PlotData> {
    const basePlotColor = "rgba(0, 112, 121, 1)";
    const markerPlotColor = "rgba(0, 112, 121, 0.5)";
    const { responseValues, parameterValues, realizationValues, parameterName, responseName } = data;
    const scatterTrace: Partial<PlotData> = {
        x: parameterValues,
        y: responseValues,
        mode: "markers",
        type: "scatter",
        marker: {
            symbol: "circle",
            size: 10,
            color: markerPlotColor,
            opacity: 0.5,
            line: {
                color: basePlotColor,
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
function createPlotlyTrendLineTrace(xValues: number[], yValues: number[]): Partial<PlotData> {
    const { slope, intercept } = linearRegression(xValues, yValues);
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const trendlineX = [minX, maxX];
    const trendlineY = [intercept + slope * minX, intercept + slope * maxX];
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
