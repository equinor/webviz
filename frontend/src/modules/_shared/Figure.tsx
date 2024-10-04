import Plot from "react-plotly.js";

import { merge } from "lodash";
import { Annotations, Layout, PlotData, Shape, XAxisName, YAxisName } from "plotly.js";

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

    getAxisIndex(row: number, column: number): number {
        if (row > this._gridAxesMapping.length || column > this._gridAxesMapping[row - 1].length) {
            throw new Error(`Invalid row/column index: ${row}/${column}`);
        }

        if (row < 1 || column < 1) {
            throw new Error(`Invalid row/column index: ${row}/${column}`);
        }

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

    addAnnotation(annotation: Partial<Annotations>, row?: number, column?: number): void {
        if (row === undefined) {
            row = 1;
        }
        if (column === undefined) {
            column = 1;
        }

        const axisIndex = this.getAxisIndex(row, column);

        const adjustedAnnotation: Partial<Annotations> = {
            ...annotation,
            xref: `x${axisIndex}` as XAxisName,
            yref: `y${axisIndex}` as YAxisName,
        };

        if (!this._plotLayout.annotations) {
            this._plotLayout.annotations = [];
        }

        this._plotLayout.annotations.push(adjustedAnnotation);
    }

    addShape(shape: Partial<Shape>, row?: number, column?: number): void {
        if (row === undefined) {
            row = 1;
        }
        if (column === undefined) {
            column = 1;
        }

        const axisIndex = this.getAxisIndex(row, column);

        const adjustedShape: Partial<Shape> = {
            ...shape,
            xref: `x${axisIndex} domain` as XAxisName,
            yref: `y${axisIndex} domain` as YAxisName,
        };

        if (!this._plotLayout.shapes) {
            this._plotLayout.shapes = [];
        }

        this._plotLayout.shapes.push(adjustedShape);
    }

    getLayout(): Partial<Layout> {
        return this._plotLayout;
    }

    getNumRows(): number {
        return this._gridAxesMapping.length;
    }

    getNumColumns(): number {
        return this._gridAxesMapping[0].length;
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

export interface MakeSubplotOptions {
    numRows?: number;
    numCols?: number;
    subplotTitles?: string[];
    sharedXAxes?: boolean | "all";
    sharedYAxes?: boolean | "all";
    width?: number;
    height?: number;
    horizontalSpacing?: number;
    verticalSpacing?: number;
    margin?: Partial<Layout["margin"]>;
    showGrid?: boolean;
}

export function makeSubplots(options: MakeSubplotOptions): Figure {
    let layout: Partial<Layout> = {
        width: options.width,
        height: options.height,
        margin: {
            l: 0,
            r: 0,
            t: 0,
            b: 0,
        },
    };

    const annotations: Partial<Annotations>[] = [];

    const gridAxesMapping: number[][] = [];

    if (!options.numRows) {
        options.numRows = 1;
    }

    if (!options.numCols) {
        options.numCols = 1;
    }

    if (options.horizontalSpacing === undefined) {
        options.horizontalSpacing = 0.2 / options.numCols;
    }

    if (options.verticalSpacing === undefined) {
        options.verticalSpacing = 0.2 / options.numRows;
    }

    const adjustedMargin = {
        l: (options.margin?.l ?? 0) / (options.width ?? 1),
        r: (options.margin?.r ?? 0) / (options.width ?? 1),
        t: (options.margin?.t ?? 0) / (options.height ?? 1),
        b: (options.margin?.b ?? 0) / (options.height ?? 1),
    };

    for (let row = 0; row < options.numRows; row++) {
        gridAxesMapping.push([]);
        for (let col = 0; col < options.numCols; col++) {
            const index = row * options.numCols + col;
            const yAxisKey = `yaxis${index + 1}`;
            const xAxisKey = `xaxis${index + 1}`;

            const anchorX = `y${index + 1}`;
            const anchorY = `x${index + 1}`;

            let matchingXAxisIndex = undefined;
            if (options.sharedXAxes === "all") {
                matchingXAxisIndex = (options.numRows - 1) * options.numCols + 1;
            } else if (options.sharedXAxes) {
                matchingXAxisIndex = col + 1;
            }

            let matchingYAxisIndex = undefined;
            if (options.sharedYAxes === "all") {
                matchingYAxisIndex = row * options.numCols + 1;
            } else if (options.sharedYAxes) {
                matchingYAxisIndex = row * options.numCols + 1;
            }

            const [xDomainStart, xDomainEnd] = makeDomain(options.numCols, col, options.horizontalSpacing, [
                adjustedMargin.l,
                adjustedMargin.r,
            ]);

            // Note that the yDomainStart and yDomainEnd are swapped because the y-axis starts at the bottom
            const [yDomainStart, yDomainEnd] = makeDomain(options.numRows, row, options.verticalSpacing, [
                adjustedMargin.b,
                adjustedMargin.t,
            ]);

            if (matchingXAxisIndex !== undefined && matchingXAxisIndex !== index + 1) {
                layout = {
                    ...layout,
                    [xAxisKey]: {
                        anchor: anchorX,
                        domain: [xDomainStart, xDomainEnd],
                        matches: `x${matchingXAxisIndex === 1 ? "" : matchingXAxisIndex}`,
                        showticklabels: false,
                        showgrid: options.showGrid ?? false,
                    },
                };
            } else {
                layout = {
                    ...layout,
                    [xAxisKey]: {
                        anchor: anchorX,
                        domain: [xDomainStart, xDomainEnd],
                        showticklabels: true,
                        showgrid: options.showGrid ?? false,
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
                        showgrid: options.showGrid ?? false,
                    },
                };
            } else {
                layout = {
                    ...layout,
                    [yAxisKey]: {
                        anchor: anchorY,
                        domain: [yDomainStart, yDomainEnd],
                        showticklabels: true,
                        showgrid: options.showGrid ?? false,
                    },
                };
            }

            if (options.subplotTitles && options.subplotTitles.length > index) {
                const title = `<b>${options.subplotTitles[index]}</b>`;
                annotations.push({
                    xanchor: "center",
                    yanchor: "top",
                    xref: "paper",
                    yref: "paper",
                    x: xDomainStart + (xDomainEnd - xDomainStart) / 2,
                    y: yDomainEnd + (options.height ? 20 / options.height : 0.02),
                    text: title,
                    showarrow: false,
                    font: {
                        size: 14,
                    },
                });
            }

            gridAxesMapping[row].push(index + 1);
        }
    }

    if (options.subplotTitles) {
        layout.annotations = annotations;
    }

    return new Figure({
        layout,
        gridAxesMapping,
    });
}
