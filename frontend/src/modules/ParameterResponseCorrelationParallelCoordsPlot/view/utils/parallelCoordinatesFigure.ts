import type { Size2D } from "@lib/utils/geometry";
import type { Figure } from "@modules/_shared/Figure";
import { makeSubplots } from "@modules/_shared/Figure";
import type { RankedParameterData, ResponseData } from "@modules/_shared/rankParameter";

export class ParallelCoordinatesFigure {
    private _figure: Figure;

    private _wrapperDivSize: Size2D;

    constructor(wrapperDivSize: Size2D) {
        this._figure = makeSubplots({
            numRows: 1,
            numCols: 1,
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

        this._wrapperDivSize = wrapperDivSize;
    }

    addPlot(
        responseData: ResponseData,
        rankedParameters: RankedParameterData[],
        options: {
            colorscale?: string;
            showColorScale?: boolean;
            lineColor?: string;
        },
    ) {
        const { trace, dimensions } = createPlotParallelCoordinates(responseData, rankedParameters, options);
        this._figure.addTrace(trace, 1, 1);
        this._figure.updateSubplotTitle(`${responseData.displayName}`, 1, 1);
        const width = Math.max(this._wrapperDivSize.width, dimensions * 80 + 250);
        this._figure.updateLayout({ width: width });
    }

    build() {
        return this._figure.makePlot();
    }
}

function createPlotParallelCoordinates(
    responseData: ResponseData,
    rankedParametersData: RankedParameterData[],
    options: {
        colorscale?: string;
        showColorScale?: boolean;
        lineColor?: string;
    } = {},
): any {
    const { colorscale = "Viridis", showColorScale = true, lineColor } = options;

    const parameterDimensions: any = [];

    rankedParametersData.forEach((param) => {
        parameterDimensions.push({
            label: param.ident.name,
            values: param.values,
        });
    });

    const responseDimension: any = {
        label: responseData.displayName,
        values: responseData.values,
    };

    const allDimensions = [responseDimension, ...parameterDimensions];

    let lineStyle: any = {};
    if (lineColor) {
        lineStyle.color = lineColor;
    } else {
        lineStyle = {
            color: responseData.values,
            colorscale: colorscale,
            showscale: showColorScale,
        };
    }
    const trace: any = {
        type: "parcoords",
        dimensions: allDimensions,
        domain: {
            x: [0.0, 1.0],
            y: [0.2, 0.9],
        },
        line: lineStyle,
        labelangle: 60,
        labelside: "bottom",
    };

    return { trace, dimensions: allDimensions.length };
}
