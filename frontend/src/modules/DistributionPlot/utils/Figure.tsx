import Plot from "react-plotly.js";

import { merge } from "lodash";
import { AxisName, Layout, LayoutAxis, PlotData } from "plotly.js";

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
        console.debug("makePlot", this._plotData, this._plotLayout);
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

export function makeSubplots({
    numRows,
    numCols,
    sharedXAxes,
    sharedYAxes,
    width,
    height,
    horizontalSpacing,
    verticalSpacing,
}: {
    numRows?: number;
    numCols?: number;
    sharedXAxes?: boolean | "all";
    sharedYAxes?: boolean | "all";
    width?: number;
    height?: number;
    horizontalSpacing?: number;
    verticalSpacing?: number;
}): Figure {
    let layout: Partial<Layout> = {
        width: width,
        height: height,
        margin: {
            t: 5,
            r: 5,
        },
    };

    let gridAxesMapping: number[][] = [];

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

    for (let row = 0; row < numRows; row++) {
        gridAxesMapping.push([]);
        for (let col = 0; col < numCols; col++) {
            const index = row * numCols + col;
            const yAxisKey = `yaxis${index + 1}`;
            const xAxisKey = `xaxis${index + 1}`;

            const anchorX = `y${index + 1}`;
            const anchorY = `x${index + 1}`;

            const matchingXAxisIndex =
                sharedXAxes === "all" ? (numRows - 1) * numCols + 1 : sharedXAxes ? col + 1 : undefined;
            const matchingYAxisIndex =
                sharedYAxes === "all" ? row * numCols + 1 : sharedYAxes ? row * numCols + 1 : undefined;

            const xDomainStart = col * (1 / numCols) + (horizontalSpacing / 2) * col;
            const xDomainEnd = (col + 1) * (1 / numCols) - (horizontalSpacing / 2) * (numCols - col - 1);

            const yDomainStart = row * (1 / numRows) + (verticalSpacing / 2) * row;
            const yDomainEnd = (row + 1) * (1 / numRows) - (verticalSpacing / 2) * (numRows - row - 1);

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
