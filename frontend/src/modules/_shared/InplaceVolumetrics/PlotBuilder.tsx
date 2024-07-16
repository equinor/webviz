import React from "react";

import { PlotData } from "plotly.js";

import { Table } from "./Table";

import { Figure, MakeSubplotOptions, makeSubplots } from "../Figure";

export class PlotBuilder {
    private _table: Table;
    private _plottingFunction: (table: Table) => Partial<PlotData>[];
    private _groupByColumn: string | null = null;
    private _subplotByColumn: string | null = null;

    constructor(table: Table, plottingFunction: (table: Table) => Partial<PlotData>[]) {
        this._table = table;
        this._plottingFunction = plottingFunction;
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

    build(
        height: number,
        width: number,
        options?: Pick<MakeSubplotOptions, "horizontalSpacing" | "verticalSpacing" | "showGrid" | "margin">
    ): React.ReactNode {
        if (!this._groupByColumn) {
            const figure = this.buildSubplots(this._table, height, width, options ?? {});
            return figure.makePlot();
        }

        const components: React.ReactNode[] = [];
        const tableCollection = this._table.splitByColumn(this._groupByColumn);
        const numTables = tableCollection.getNumTables();
        const collectionMap = tableCollection.getCollectionMap();

        for (const [key, table] of collectionMap) {
            const figure = this.buildSubplots(table, height / numTables, width, options ?? {});
            components.push(<h3 key={key}>{key}</h3>);
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

            const traces = this._plottingFunction(table);
            for (const trace of traces) {
                figure.addTrace(trace);
            }
            return figure;
        }

        const tableCollection = table.splitByColumn(this._subplotByColumn);
        const numTables = tableCollection.getNumTables();
        const numRows = Math.ceil(Math.sqrt(numTables));
        const numCols = Math.ceil(numTables / numRows);

        const tables = tableCollection.getTables();
        const keys = tableCollection.getKeys();

        const traces: { row: number; col: number; trace: Partial<PlotData> }[] = [];
        const subplotTitles: string[] = Array(numRows * numCols).fill("");

        for (let row = 1; row <= numRows; row++) {
            for (let col = 1; col <= numCols; col++) {
                const index = (numRows - 1 - (row - 1)) * numCols + (col - 1);
                if (!keys[index]) {
                    continue;
                }
                const label = keys[index].toString();
                subplotTitles[(row - 1) * numCols + col - 1] = label;

                const table = tables[index];

                const plotDataArr = this._plottingFunction(table);
                for (const plotData of plotDataArr) {
                    traces.push({ row, col, trace: plotData });
                }
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

        return figure;
    }
}
