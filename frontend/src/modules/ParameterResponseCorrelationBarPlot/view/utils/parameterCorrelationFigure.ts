import type { PlotData } from "plotly.js";

import type { Size2D } from "@lib/utils/geometry";
import type { Figure } from "@modules/_shared/Figure";
import { makeSubplots } from "@modules/_shared/Figure";
import type { RankedParameterCorrelation } from "@modules/_shared/rankParameter";

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
        row: number,
        column: number,
        cellIndex: number,
        title: string,
        color?: string,
    ) {
        const correlationTrace = createCorrelationTrace(data, highlightedParameterString, this._showLabel, color);

        this._figure.addTrace(correlationTrace, row, column);

        this._figure.updateSubplotTitle(`${title}`, row, column);

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

    build(handleOnClick?: ((event: Readonly<Plotly.PlotMouseEvent>) => void) | undefined): React.ReactNode {
        return this._figure.makePlot({ onClick: handleOnClick });
    }
}

function createCorrelationTrace(
    rankedParameters: RankedParameterCorrelation[],
    highlightedParameterString: string | null,

    showLabel: boolean,
    color?: string,
): Partial<PlotData> {
    const identStrings = rankedParameters.map((p) => p.ident.toString());
    const names = rankedParameters.map((p) => p.ident.name);
    const correlations = rankedParameters.map((p) => p.correlation!);
    const colors = identStrings.map((identString) => {
        if (highlightedParameterString && identString === highlightedParameterString) {
            return `${color}FF`;
        }
        return highlightedParameterString ? `${color}80` : `${color}FF`;
    });
    const lineColors = identStrings.map((identString) => {
        if (highlightedParameterString && identString === highlightedParameterString) {
            return "#000000FF";
        }
        return `${color}80`;
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
