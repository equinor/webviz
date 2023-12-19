import Plot from "react-plotly.js";

import { merge } from "lodash";
import { Layout, PlotData } from "plotly.js";

export class Figure {
    private _plotData: Partial<PlotData>[];
    private _plotLayout: Partial<Layout>;
    private _gridAxesMapping: number[][];

    constructor({
        data,
        layout,
        gridAxesMapping,
    }: {
        data?: PlotData[];
        layout?: Partial<Layout>;
        gridAxesMapping?: number[][];
    }) {
        this._plotData = data ?? [];
        this._plotLayout = layout ?? {};
        this._gridAxesMapping = gridAxesMapping ?? [[1, 1]];
    }

    private getAxisIndex(row: number, column: number): number {
        return this._gridAxesMapping[row - 1][column - 1];
    }

    addTrace(trace: Partial<PlotData>, row?: number, column?: number): void {
        if (row === undefined) {
            row = 1;
        }
        if (column === undefined) {
            column = 1;
        }

        const axisIndex = this.getAxisIndex(row, column);

        const adjustedTrace = {
            ...trace,
            xaxis: `x${axisIndex}`,
            yaxis: `y${axisIndex}`,
        };

        this._plotData.push(adjustedTrace);
    }

    updateLayout(patch: Partial<Layout>): void {
        merge(this._plotLayout, patch);
    }

    makePlot(): React.ReactNode {
        return (
            <Plot
                data={this._plotData}
                layout={this._plotLayout}
                config={{
                    displaylogo: false,
                    responsive: true,
                    modeBarButtonsToRemove: ["toImage", "sendDataToCloud", "autoScale2d", "resetScale2d"],
                }}
            />
        );
    }
}

function makeDomain(numElements: number, index: number, spacing: number, margin: [number, number]): [number, number] {
    const size = 1 - margin[0] - margin[1];
    let domainStart = margin[0] + (index / numElements) * size;
    let domainEnd = margin[0] + ((index + 1) / numElements) * size;
    if (index > 0) {
        domainStart += spacing / 2;
    }
    if (index < numElements - 1) {
        domainEnd -= spacing / 2;
    }

    return [domainStart, domainEnd];
}

export function makeSubplots({
    numRows,
    numCols,
    sharedXAxes,
    sharedYAxes,
    width,
    height,
    horizontalSpacing,
    verticalSpacing,
    margin,
}: {
    numRows?: number;
    numCols?: number;
    sharedXAxes?: boolean | "all";
    sharedYAxes?: boolean | "all";
    width?: number;
    height?: number;
    horizontalSpacing?: number;
    verticalSpacing?: number;
    margin?: Partial<Layout["margin"]>;
}): Figure {
    let layout: Partial<Layout> = {
        width,
        height,
        margin,
    };

    const gridAxesMapping: number[][] = [];

    if (!numRows) {
        numRows = 1;
    }

    if (!numCols) {
        numCols = 1;
    }

    if (horizontalSpacing === undefined) {
        horizontalSpacing = 0.2 / numCols;
    }

    if (verticalSpacing === undefined) {
        verticalSpacing = 0.2 / numRows;
    }

    const adjustedMargin = {
        l: (margin?.l ?? 0) / (width ?? 1),
        r: (margin?.r ?? 0) / (width ?? 1),
        t: (margin?.t ?? 0) / (height ?? 1),
        b: (margin?.b ?? 0) / (height ?? 1),
    };

    for (let row = 0; row < numRows; row++) {
        gridAxesMapping.push([]);
        for (let col = 0; col < numCols; col++) {
            const index = row * numCols + col;
            const yAxisKey = `yaxis${index + 1}`;
            const xAxisKey = `xaxis${index + 1}`;

            const anchorX = `y${index + 1}`;
            const anchorY = `x${index + 1}`;

            let matchingXAxisIndex = undefined;
            if (sharedXAxes === "all") {
                matchingXAxisIndex = (numRows - 1) * numCols + 1;
            } else if (sharedXAxes) {
                matchingXAxisIndex = col + 1;
            }

            let matchingYAxisIndex = undefined;
            if (sharedYAxes === "all") {
                matchingYAxisIndex = row * numCols + 1;
            } else if (sharedYAxes) {
                matchingYAxisIndex = row * numCols + 1;
            }

            const [xDomainStart, xDomainEnd] = makeDomain(numCols, col, horizontalSpacing, [
                adjustedMargin.l,
                adjustedMargin.r,
            ]);
            const [yDomainStart, yDomainEnd] = makeDomain(numRows, row, verticalSpacing, [
                adjustedMargin.t,
                adjustedMargin.b,
            ]);

            if (matchingXAxisIndex !== undefined && matchingXAxisIndex !== index + 1) {
                layout = {
                    ...layout,
                    [xAxisKey]: {
                        anchor: anchorX,
                        domain: [xDomainStart, xDomainEnd],
                        matches: `x${matchingXAxisIndex === 1 ? "" : matchingXAxisIndex}`,
                        showticklabels: false,
                    },
                };
            } else {
                layout = {
                    ...layout,
                    [xAxisKey]: {
                        anchor: anchorX,
                        domain: [xDomainStart, xDomainEnd],
                        showticklabels: true,
                    },
                };
            }

            if (matchingYAxisIndex !== undefined && matchingYAxisIndex !== index + 1) {
                layout = {
                    ...layout,
                    [yAxisKey]: {
                        anchor: anchorY,
                        domain: [yDomainStart, yDomainEnd],
                        matches: `y${matchingYAxisIndex === 1 ? "" : matchingYAxisIndex}`,
                        showticklabels: false,
                    },
                };
            } else {
                layout = {
                    ...layout,
                    [yAxisKey]: {
                        anchor: anchorY,
                        domain: [yDomainStart, yDomainEnd],
                        showticklabels: true,
                    },
                };
            }

            gridAxesMapping[row].push(index + 1);
        }
    }

    return new Figure({
        layout,
        gridAxesMapping,
    });
}
