import type { PlotParams } from "react-plotly.js";
import Plot from "react-plotly.js";

import { merge } from "lodash";
import type { Annotations, AxisType, Layout, PlotData, Shape, XAxisName, YAxisName } from "plotly.js";

/**
 * Enum for axis coordinate domain.
 *
 * SCENE: Use scene domain positions for the axis, a scalar/percentage position relative to the axis. Note: This makes shapes
 *        placed in the same position in the view, independent of zoom etc.
 * DATA: Use data for the axis, i.e. matching the value range of the axis. This way it can follow zoom and axis range changes.
 */
export const enum CoordinateDomain {
    SCENE = "scene",
    DATA = "data",
}

/**
 * Class to create a Plotly figure.
 *
 * With rows and columns starting at 1, and axis index starting at 1.
 *
 * By default, the subplots for plotly are arranged in a grid, first cell bottom-left and last top-right. Which implies
 * columns from left to right and rows from bottom to top.
 *
 * The default layout for a 3x3 grid, with row/column -> grid axis mapping (r1 = row 1, c1 = column 1):
 *
 *                [row/col]            [grid axis]
 *              r3c1 r3c2 r3c3       x7y7 x8y8 x9y9
 *              r2c1 r2c2 r2c3   ->  x4y4 x5y5 x6y6
 *              r1c1 r1c2 r1c3       x1y1 x2y2 x3y3
 *
 * This default row/column to grid axis can be changed with the gridAxesMapping property. The default grid axis assigned
 * top-left to bottom-right can be changed by providing custom layout linking the axes and domain positions.
 */
export class Figure {
    private _plotData: Partial<PlotData>[];
    private _plotLayout: Partial<Layout>;
    private _gridAxesMapping: number[][];
    private _axesIndexToSubplotTitleAnnotationMap: Map<number, Partial<Annotations>>;

    constructor({
        data,
        layout,
        gridAxesMapping,
        axesIndexToSubplotTitleAnnotationMap,
    }: {
        data?: PlotData[];
        layout?: Partial<Layout>;
        gridAxesMapping?: number[][];
        axesIndexToSubplotTitleAnnotationMap?: Map<number, Partial<Annotations>>;
    }) {
        this._plotData = data ?? [];
        this._plotLayout = layout ?? {};
        this._gridAxesMapping = gridAxesMapping ?? [[1, 1]];
        this._axesIndexToSubplotTitleAnnotationMap = axesIndexToSubplotTitleAnnotationMap ?? new Map();
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

    addTraces(traces: Partial<PlotData>[], row?: number, column?: number): void {
        traces.forEach((trace) => this.addTrace(trace, row, column));
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

    addShape(
        shape: Partial<Shape>,
        row?: number,
        column?: number,
        xCoordinateDomain = CoordinateDomain.DATA,
        yCoordinateDomain = CoordinateDomain.DATA,
    ): void {
        if (row === undefined) {
            row = 1;
        }
        if (column === undefined) {
            column = 1;
        }

        const axisIndex = this.getAxisIndex(row, column);

        const adjustedShape: Partial<Shape> = {
            ...shape,
            xref: this.makeXAxisRef(axisIndex, xCoordinateDomain),
            yref: this.makeYAxisRef(axisIndex, yCoordinateDomain),
        };

        if (!this._plotLayout.shapes) {
            this._plotLayout.shapes = [];
        }

        this._plotLayout.shapes.push(adjustedShape);
    }

    addAnnotation(
        annotation: Partial<Annotations>,
        row?: number,
        column?: number,
        xCoordinateDomain = CoordinateDomain.DATA,
        yCoordinateDomain = CoordinateDomain.DATA,
    ): void {
        if (row === undefined) {
            row = 1;
        }
        if (column === undefined) {
            column = 1;
        }

        const axisIndex = this.getAxisIndex(row, column);

        const adjustedAnnotation: Partial<Annotations> = {
            ...annotation,
            xref: this.makeXAxisRef(axisIndex, xCoordinateDomain),
            yref: this.makeYAxisRef(axisIndex, yCoordinateDomain),
        };

        if (!this._plotLayout.annotations) {
            this._plotLayout.annotations = [];
        }

        this._plotLayout.annotations.push(adjustedAnnotation);
    }

    hasSubplotTitle(row: number, column: number): boolean {
        const axisIndex = this.getAxisIndex(row, column);
        const subplotTitleAnnotation = this._axesIndexToSubplotTitleAnnotationMap.get(axisIndex);

        return subplotTitleAnnotation !== undefined;
    }

    updateSubplotTitle(title: string, row: number, column: number): void {
        const axisIndex = this.getAxisIndex(row, column);
        const subplotTitleAnnotation = this._axesIndexToSubplotTitleAnnotationMap.get(axisIndex);

        if (!subplotTitleAnnotation) {
            throw new Error(`No subplot title annotation found for row ${row} and column ${column}`);
        }

        // Update the title in the internal mapping - modify by reference
        subplotTitleAnnotation.text = title;
    }

    makeLayout(): Partial<Layout> {
        const layout = { ...this._plotLayout };
        layout.annotations = [
            ...(layout.annotations ?? []),
            ...Array.from(this._axesIndexToSubplotTitleAnnotationMap.values()),
        ];

        return layout;
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

    makePlot(plotArgs?: Omit<PlotParams, "data" | "layout">): React.ReactNode {
        const config = plotArgs?.config ?? {
            displaylogo: false,
            responsive: true,
            modeBarButtonsToRemove: ["toImage", "sendDataToCloud", "resetScale2d"],
        };

        return (
            <Plot
                key={this._plotData.length} // Note: Temporary to trigger re-render and remove legends when plotData is empty
                data={this._plotData}
                layout={this.makeLayout()}
                config={config}
                {...plotArgs}
            />
        );
    }

    private makeYAxisRef(axisIndex: number, coordinateDomain: CoordinateDomain): YAxisName {
        return (coordinateDomain === CoordinateDomain.SCENE ? `y${axisIndex} domain` : `y${axisIndex}`) as YAxisName;
    }

    private makeXAxisRef(axisIndex: number, coordinateDomain: CoordinateDomain): XAxisName {
        return (coordinateDomain === CoordinateDomain.SCENE ? `x${axisIndex} domain` : `x${axisIndex}`) as XAxisName;
    }
}

function makeDomain(
    numElements: number,
    elementIndex: number,
    spacing: number,
    margin: { start: number; end: number },
    reversedAxis?: boolean,
): [number, number] {
    const size = 1 - margin.start - margin.end;

    // Reverse axis if needed
    const actualStartMargin = reversedAxis ? margin.end : margin.start;
    const actualIndex = reversedAxis ? numElements - elementIndex - 1 : elementIndex;

    let domainStart = actualStartMargin + (actualIndex / numElements) * size;
    let domainEnd = actualStartMargin + ((actualIndex + 1) / numElements) * size;
    if (elementIndex > 0) {
        reversedAxis ? (domainEnd -= spacing / 2) : (domainStart += spacing / 2);
    }
    if (elementIndex < numElements - 1) {
        reversedAxis ? (domainStart += spacing / 2) : (domainEnd -= spacing / 2);
    }

    return [domainStart, domainEnd];
}

function makeXDomain(
    numColumns: number,
    columnIndex: number,
    spacing: number,
    margin: { left: number; right: number },
): [number, number] {
    return makeDomain(numColumns, columnIndex, spacing, { start: margin.left, end: margin.right });
}

function makeReversedYAxisDomain(
    numRows: number,
    rowIndex: number,
    spacing: number,
    margin: { top: number; bottom: number },
): [number, number] {
    return makeDomain(numRows, rowIndex, spacing, { start: margin.top, end: margin.bottom }, true);
}

/**
 * Options for the makeSubplots function.
 *
 * numRows: Number of rows in the subplot grid.
 * numCols: Number of columns in the subplot grid.
 * subplotTitles: Subplot titles, arranged from top-left to bottom-right. Each subplot is assigned a title annotation with the corresponding title text from the array.
 *                Missing titles in the array, or undefined titles, result in empty title text.
 * sharedXAxes: Whether to share x-axes between subplots.
 * sharedYAxes: Whether to share y-axes between subplots.
 * width: Width of the figure.
 * height: Height of the figure.
 * horizontalSpacing: Spacing between subplots in the horizontal direction.
 * verticalSpacing: Spacing between subplots in the vertical direction.
 * margin: Margin around the subplots.
 * showGrid: Whether to show grid lines.
 * xAxisType: Type of x-axis.
 * xAxisTickAngle: Angle of x-axis tick labels.
 * yAxisTickAngle: Angle of y-axis tick labels.
 */
export interface MakeSubplotOptions {
    numRows?: number;
    numCols?: number;
    title?: string;
    subplotTitles?: string[];
    sharedXAxes?: boolean | "all" | "rows" | "columns";
    sharedYAxes?: boolean | "all" | "rows" | "columns";
    width?: number;
    height?: number;
    horizontalSpacing?: number;
    verticalSpacing?: number;
    margin?: Partial<Layout["margin"]>;
    showGrid?: boolean;
    xAxisType?: AxisType;
    xAxisTickAngle?: number;
    yAxisTickAngle?: number;
}

/**
 * Utility function to create a figure with subplots.
 *
 * This function creates grid axis mapping with index from top-left to bottom-right, with row and column number
 * starting at 1, and with first cell axis index starting at 1. This is different from default Plotly which has
 * bottom-left as the first cell.
 *
 * Loosely based on the python plotly function make_subplots:
 * https://github.com/plotly/plotly.py/blob/master/packages/python/plotly/plotly/subplots.py
 */
export function makeSubplots(options: MakeSubplotOptions): Figure {
    const titleMargin = options.title ? 40 : 0;
    let layout: Partial<Layout> = {
        width: options.width,
        height: options.height,
        margin: {
            l: 0,
            r: 0,
            t: titleMargin,
            b: 0,
        },
        title: options.title,
    };

    const axesIndexToSubplotTitleAnnotationMap: Map<number, Partial<Annotations>> = new Map();

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

    // Default plotly has rows from bottom. The order is reversed for top down, done by the manipulating the domain positions.
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
                matchingXAxisIndex = 1;
            } else if (options.sharedXAxes === true || options.sharedXAxes === "columns") {
                matchingXAxisIndex = col + 1;
            } else if (options.sharedXAxes === "rows") {
                matchingXAxisIndex = row * options.numCols + 1;
            }

            let matchingYAxisIndex = undefined;
            if (options.sharedYAxes === "all") {
                matchingYAxisIndex = 1;
            } else if (options.sharedYAxes === true || options.sharedYAxes === "rows") {
                matchingYAxisIndex = row * options.numCols + 1;
            } else if (options.sharedYAxes === "columns") {
                matchingYAxisIndex = col + 1;
            }

            const [xDomainStart, xDomainEnd] = makeXDomain(options.numCols, col, options.horizontalSpacing, {
                left: adjustedMargin.l,
                right: adjustedMargin.r,
            });

            // Note that the first cell in plotly is bottom-left, thus y-domain positions are reversed to get top-left layout.
            const [yDomainStart, yDomainEnd] = makeReversedYAxisDomain(options.numRows, row, options.verticalSpacing, {
                top: adjustedMargin.t,
                bottom: adjustedMargin.b,
            });

            if (matchingXAxisIndex !== undefined && matchingXAxisIndex !== index + 1) {
                layout = {
                    ...layout,
                    [xAxisKey]: {
                        anchor: anchorX,
                        domain: [xDomainStart, xDomainEnd],
                        matches: `x${matchingXAxisIndex === 1 ? "" : matchingXAxisIndex}`,
                        showticklabels: true,
                        tickangle: options.xAxisTickAngle,
                        showgrid: options.showGrid ?? false,
                        type: options.xAxisType,
                    },
                };
            } else {
                layout = {
                    ...layout,
                    [xAxisKey]: {
                        anchor: anchorX,
                        domain: [xDomainStart, xDomainEnd],
                        showticklabels: true,
                        tickangle: options.xAxisTickAngle,
                        showgrid: options.showGrid ?? false,
                        type: options.xAxisType,
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
                        showticklabels: true,
                        tickangle: options.yAxisTickAngle,
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
                        tickangle: options.yAxisTickAngle,
                        showgrid: options.showGrid ?? false,
                    },
                };
            }

            // Add subplot titles as annotations.
            // - If title is provided, apply string, otherwise set empty text for the annotation.
            const title = options.subplotTitles ? `<b>${options.subplotTitles[index] ?? ""}</b>` : "";
            axesIndexToSubplotTitleAnnotationMap.set(index + 1, {
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

            gridAxesMapping[row].push(index + 1);
        }
    }

    return new Figure({
        layout,
        gridAxesMapping,
        axesIndexToSubplotTitleAnnotationMap,
    });
}
