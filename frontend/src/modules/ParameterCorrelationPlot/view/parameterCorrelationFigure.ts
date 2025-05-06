import { RankedParameterCorrelation } from "../../_shared/utils/rankParameter";
import { Size2D } from "@lib/utils/geometry";
import { Figure, makeSubplots } from "@modules/_shared/Figure";
import type { PlotData } from "plotly.js";

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
        });

        this._showLabel = showLabel;
    }

    addCorrelationTrace(
        data: RankedParameterCorrelation[],
        rowIndex: number,
        columnIndex: number,
        cellIndex: number,
        title: string
    ) {
        const correlationTrace = createCorrelationTrace(data, this._showLabel);

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

    build() {
        return this._figure.makePlot();
    }
}

function createCorrelationTrace(
    rankedParameters: RankedParameterCorrelation[],
    showLabel: boolean,
    color?: string
): Partial<PlotData> {
    const identStrings = rankedParameters.map((p) => p.ident.toString());
    const names = rankedParameters.map((p) => p.ident.name);
    const correlations = rankedParameters.map((p) => p.correlation!);

    let trace: Partial<PlotData> = {
        x: correlations,
        y: names,
        customdata: identStrings,
        type: "bar",
        orientation: "h",
        marker: {
            color: "rgba(0.0, 112.0, 121.0, .5)",
            line: {
                color: "rgba(0.0, 112.0, 121.0, 1)",
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
