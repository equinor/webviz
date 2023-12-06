import Plot from "react-plotly.js";

import { merge } from "lodash";
import { Layout, PlotData } from "plotly.js";

export class Figure {
    private _plotData: Partial<PlotData>[];
    private _plotLayout: Partial<Layout>;

    constructor({ data, layout }: { data?: PlotData[]; layout?: Partial<Layout> }) {
        this._plotData = data ?? [];
        this._plotLayout = layout ?? {};
    }

    addTrace(trace: Partial<PlotData>, row?: number, column?: number): void {
        if (row === undefined) {
            row = 1;
        }
        if (column === undefined) {
            column = 1;
        }

        trace = {
            ...trace,
            xaxis: `x${column}`,
            yaxis: `y${row}`,
        };

        this._plotData.push(trace);
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
        grid: {
            rows: numRows,
            columns: numCols,
            pattern: "coupled",
        },
        margin: {
            t: 5,
            r: 5,
        },
    };

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
        for (let col = 0; col < numCols; col++) {
            const index = row * numCols + col;
            const yAxisKey = `yaxis${index + 1}`;
            const xAxisKey = `xaxis${index + 1}`;

            const matchingXAxisKey =
                sharedXAxes === "all"
                    ? `xaxis${(numRows - 1) * numCols + 1}`
                    : sharedXAxes
                    ? `xaxis${(numRows - 1) * numCols + col + 1}`
                    : undefined;
            const matchingYAxisKey =
                sharedYAxes === "all"
                    ? `yaxis${(numRows - 1) * numCols + 1}`
                    : sharedYAxes
                    ? `yaxis${(numRows - 1) * numCols + col + 1}`
                    : undefined;

            const xDomainStart = col * (1 / numCols) + (horizontalSpacing / 2) * col;
            const xDomainEnd = (col + 1) * (1 / numCols) - (horizontalSpacing / 2) * (numCols - col - 1);

            const yDomainStart = row * (1 / numRows) + (verticalSpacing / 2) * row;
            const yDomainEnd = (row + 1) * (1 / numRows) - (verticalSpacing / 2) * (numRows - row - 1);

            layout = {
                ...layout,
                [xAxisKey]: {
                    anchor: yAxisKey,
                    zeroline: true,
                    showgrid: true,
                    matches: matchingXAxisKey,
                    domain: [xDomainStart, xDomainEnd],
                },
                [yAxisKey]: {
                    anchor: xAxisKey,
                    zeroline: true,
                    showgrid: true,
                    matches: matchingYAxisKey,
                    domain: [yDomainStart, yDomainEnd],
                },
            };
        }
    }

    return new Figure({
        layout,
    });
}
