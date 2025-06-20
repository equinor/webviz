import type { PlotData } from "plotly.js";

import type { Size2D } from "@lib/utils/geometry";
import type { Figure } from "@modules/_shared/Figure";
import { makeSubplots } from "@modules/_shared/Figure";

import type { RankedParameterCorrelation } from "../../_shared/rankParameter";

export class ParameterCorrelationFigure {
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
            horizontalSpacing: 0.2,
            margin: {
                t: 20,
                r: 20,
                b: 20,
                l: 20,
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

    addCorrelationTrace(
        data: RankedParameterCorrelation[],
        highlightedParameterString: string | null,
        rowIndex: number,
        columnIndex: number,
        cellIndex: number,
        title: string,
    ) {
        const correlationTrace = createCorrelationTrace(data, highlightedParameterString, this._showLabel);

        this._figure.addTrace(correlationTrace, rowIndex, columnIndex);

        this._figure.updateSubplotTitle(`${title}`, rowIndex, columnIndex);

        this._figure.updateLayout({
            [`xaxis${cellIndex + 1}`]: {
                zeroline: true,
            },
            [`yaxis${cellIndex + 1}`]: {
                autorange: "reversed",
                visible: false,
            },
        });
    }

    makePlotData() {
        return this._figure.makeData();
    }

    makePlotLayout() {
        return this._figure.makeLayout();
    }
}

function createCorrelationTrace(
    rankedParameters: RankedParameterCorrelation[],
    highlightedParameterString: string | null,
    showLabel: boolean,
): Partial<PlotData> {
    const identStrings = rankedParameters.map((p) => p.ident.toString());
    const names = rankedParameters.map((p) => p.ident.name);
    const correlations = rankedParameters.map((p) => p.correlation!);
    const colors = identStrings.map((identString) => {
        if (highlightedParameterString && identString === highlightedParameterString) {
            return "rgba(255, 18, 67, .5)";
        }
        return "rgba(0.0, 112.0, 121.0, .5)";
    });
    const lineColors = identStrings.map((identString) => {
        if (highlightedParameterString && identString === highlightedParameterString) {
            return "rgba(255, 18, 67, 1)";
        }
        return "rgba(0.0, 112.0, 121.0, 1)";
    });
    let trace: Partial<PlotData> = {
        x: correlations,
        y: names,
        customdata: identStrings,
        type: "bar",
        orientation: "h",
        marker: {
            color: colors,
            line: {
                color: lineColors,
                width: 1,
            },
        },
        hovertemplate: "Parameter = <b>%{y}</b><br>Correlation = <b>%{x}</b><extra></extra>",
        hoverlabel: {
            bgcolor: "white",
            font: { size: 12, color: "black" },
        },
    };
    if (showLabel) {
        trace = {
            ...trace,
            text: names,
            textposition: "inside",
            insidetextanchor: "middle",
            textfont: {
                color: "white",
            },
        };
    }
    return trace;
}
