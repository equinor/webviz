import React from "react";

import { PlotData } from "plotly.js";
import { Axis } from "plotly.js";

import { Table } from "./Table";

import { Figure, MakeSubplotOptions, makeSubplots } from "../Figure";

export class PlotBuilder {
    private _table: Table;
    private _plotFunction: (table: Table) => Partial<PlotData>[];
    private _formatLabelFunction: (columnName: string, label: string | number) => string = (_, value) =>
        value.toString();
    private _groupByColumn: string | null = null;
    private _subplotByColumn: string | null = null;
    private _axesOptions: { x: Partial<Axis> | null; y: Partial<Axis> | null } = { x: null, y: null };
    private _highlightedSubPlotNames: string[] = [];

    constructor(table: Table, plotFunction: (table: Table) => Partial<PlotData>[]) {
        this._table = table;
        this._plotFunction = plotFunction;
    }

    setGroupByColumn(columnName: string): void {
        if (!this._table.getColumn(columnName)) {
            throw new Error(`Column not found: ${columnName}`);
        }
        this._groupByColumn = columnName;
    }

    setSubplotByColumn(columnName: string): void {
        if (!this._table.getColumn(columnName)) {
            throw new Error(`Column not found: ${columnName}`);
        }
        this._subplotByColumn = columnName;
    }

    setXAxisOptions(options: Partial<Axis>): void {
        this._axesOptions.x = options;
    }

    setYAxisOptions(options: Partial<Axis>): void {
        this._axesOptions.y = options;
    }

    setFormatLabelFunction(func: (columnName: string, label: string | number) => string): void {
        this._formatLabelFunction = func;
    }

    setHighlightedSubPlots(subPlotNames: string[]): void {
        this._highlightedSubPlotNames = subPlotNames;
    }

    private calcNumRowsAndCols(numTables: number): { numRows: number; numCols: number } {
        if (numTables < 1) {
            return { numRows: 1, numCols: 1 };
        }

        const numRows = Math.ceil(Math.sqrt(numTables));
        const numCols = Math.ceil(numTables / numRows);
        return { numRows, numCols };
    }

    private updateLayout(figure: Figure) {
        const numRows = figure.getNumRows();
        const numCols = figure.getNumColumns();

        for (let row = 1; row <= numRows; row++) {
            for (let col = 1; col <= numCols; col++) {
                const axisIndex = figure.getAxisIndex(row, col);
                const yAxisKey = `yaxis${axisIndex}`;
                const xAxisKey = `xaxis${axisIndex}`;

                const oldLayout = figure.getLayout();

                figure.updateLayout({
                    // @ts-expect-error - Ignore string type of xAxisKey for oldLayout[xAxisKey]
                    [xAxisKey]: { ...oldLayout[xAxisKey], ...this._axesOptions.x },
                    // @ts-expect-error - Ignore string type of yAxisKey for oldLayout[yAxisKey]
                    [yAxisKey]: { ...oldLayout[yAxisKey], ...this._axesOptions.y },
                });
            }
        }
    }

    build(
        height: number,
        width: number,
        options?: Pick<
            MakeSubplotOptions,
            "horizontalSpacing" | "verticalSpacing" | "showGrid" | "margin" | "sharedXAxes" | "sharedYAxes"
        >
    ): React.ReactNode {
        if (!this._groupByColumn) {
            const figure = this.buildSubplots(this._table, height, width, options ?? {});
            this.updateLayout(figure);
            return figure.makePlot();
        }

        const components: React.ReactNode[] = [];
        const tableCollection = this._table.splitByColumn(this._groupByColumn);
        const numTables = tableCollection.getNumTables();
        const collectionMap = tableCollection.getCollectionMap();

        for (const [key, table] of collectionMap) {
            const figure = this.buildSubplots(table, height / numTables, width, options ?? {});
            this.updateLayout(figure);
            const label = this._formatLabelFunction(tableCollection.getCollectedBy(), key);
            components.push(<h3 key={key}>{label}</h3>);
            components.push(figure.makePlot());
        }

        return <>{components}</>;
    }

    private buildSubplots(
        table: Table,
        height: number,
        width: number,
        options: Pick<MakeSubplotOptions, "horizontalSpacing" | "verticalSpacing" | "showGrid" | "margin">
    ): Figure {
        if (!this._subplotByColumn) {
            const figure = makeSubplots({
                numRows: 1,
                numCols: 1,
                height,
                width,
                ...options,
            });

            const traces = this._plotFunction(table);
            for (const trace of traces) {
                figure.addTrace(trace);
            }
            return figure;
        }

        const keepColumn = true;
        const tableCollection = table.splitByColumn(this._subplotByColumn, keepColumn);
        const numTables = tableCollection.getNumTables();
        const { numRows, numCols } = this.calcNumRowsAndCols(numTables);

        const tables = tableCollection.getTables();
        const keys = tableCollection.getKeys();

        const traces: { row: number; col: number; trace: Partial<PlotData> }[] = [];
        const subplotTitles: string[] = Array(numRows * numCols).fill("");

        const highlightedSubplots: { row: number; col: number }[] = [];

        let legendAdded = false;
        for (let row = 1; row <= numRows; row++) {
            for (let col = 1; col <= numCols; col++) {
                const index = (numRows - 1 - (row - 1)) * numCols + (col - 1);
                if (!keys[index]) {
                    continue;
                }
                const label = this._formatLabelFunction(tableCollection.getCollectedBy(), keys[index]);
                subplotTitles[(row - 1) * numCols + col - 1] = label;

                if (this._highlightedSubPlotNames.includes(keys[index].toString())) {
                    highlightedSubplots.push({ row, col });
                }

                const table = tables[index];

                const plotDataArr = this._plotFunction(table);
                for (const plotData of plotDataArr) {
                    if (legendAdded) {
                        plotData.showlegend = false;
                    }
                    traces.push({ row, col, trace: plotData });
                }
                legendAdded = true;
            }
        }

        const figure = makeSubplots({
            numRows,
            numCols,
            height,
            width,
            subplotTitles,
            ...options,
        });

        for (const { row, col, trace } of traces) {
            figure.addTrace(trace, row, col);
        }

        for (const { row, col } of highlightedSubplots) {
            figure.addShape(
                {
                    type: "rect",
                    line: {
                        color: "blue",
                        width: 1,
                    },
                    x0: 0,
                    x1: 1,
                    y0: 0,
                    y1: 1,
                },
                row,
                col
            );
        }

        return figure;
    }
}
