import { EnsembleIdent } from "@framework/EnsembleIdent";

import { TableCollection } from "./TableCollection";

export enum ColumnType {
    ENSEMBLE = "ensemble",
    TABLE = "table",
    FLUID_ZONE = "fluidZone",
    REAL = "real",
    IDENTIFIER = "identifier",
    RESULT = "result",
}

export class Column<TValue = string | number> {
    private _name: string;
    private _type: ColumnType;
    private _uniqueValues: TValue[] = [];
    private _indices: number[] = [];

    constructor(name: string, type: ColumnType);
    constructor(name: string, type: ColumnType, uniqueValues: TValue[], indices: number[]);
    constructor(name: string, type: ColumnType, uniqueValues: TValue[] = [], indices: number[] = []) {
        this._name = name;
        this._type = type;
        this._uniqueValues = uniqueValues;
        this._indices = indices;
    }

    getName(): string {
        return this._name;
    }

    getType(): ColumnType {
        return this._type;
    }

    getUniqueValues(): TValue[] {
        return this._uniqueValues;
    }

    getRowsWhere(predicate: (value: TValue) => boolean): { index: number; value: TValue }[] {
        const rows: { index: number; value: TValue }[] = [];
        for (let i = 0; i < this._indices.length; i++) {
            const value = this._uniqueValues[this._indices[i]];
            if (predicate(value)) {
                rows.push({ index: i, value });
            }
        }
        return rows;
    }

    getNumRows(): number {
        return this._indices.length;
    }

    addRowValue(value: TValue): void {
        const index = this._uniqueValues.indexOf(value);
        if (index === -1) {
            this._uniqueValues.push(value);
            this._indices.push(this._uniqueValues.length - 1);
            return;
        }
        this._indices.push(index);
    }

    addRowValues(values: TValue[]): void {
        for (const value of values) {
            this.addRowValue(value);
        }
    }

    getRowValue(rowIndex: number): TValue {
        if (rowIndex < 0 || rowIndex >= this._indices.length) {
            throw new Error(`Invalid index: ${rowIndex}`);
        }

        return this._uniqueValues[this._indices[rowIndex]];
    }

    getAllRowValues(): TValue[] {
        return this._indices.map((i) => this._uniqueValues[i]);
    }

    cloneEmpty(): Column<TValue> {
        return new Column(this._name, this._type);
    }

    reduce<TAcc>(reduceFunc: (acc: TAcc, value: TValue) => TAcc, initialValue: TAcc): TAcc {
        return this.getAllRowValues().reduce(reduceFunc, initialValue);
    }
}

export interface Row {
    [columnName: string]: string | number;
}

export class Table {
    private _columns: Column[];

    constructor(columns: Column[]) {
        this._columns = columns;
        this.assertColumnLengthsMatch();
    }

    private assertColumnLengthsMatch(): void {
        const numRows = this._columns[0].getNumRows();
        for (const column of this._columns) {
            if (column.getNumRows() !== numRows) {
                throw new Error("Column lengths do not match");
            }
        }
    }

    getNumColumns(): number {
        return this._columns.length;
    }

    getNumRows(): number {
        return this._columns[0].getNumRows();
    }

    getColumns(): Column<any>[] {
        return this._columns;
    }

    getColumn(columnName: string): Column | undefined {
        return this._columns.find((c) => c.getName() === columnName);
    }

    getRows(): Row[] {
        const rows: Row[] = [];
        for (let i = 0; i < this.getNumRows(); i++) {
            rows.push(this.getRow(i));
        }
        return rows;
    }

    getRow(rowIndex: number): Row {
        if (rowIndex < 0 || rowIndex >= this.getNumRows()) {
            throw new Error(`Invalid row index: ${rowIndex}`);
        }

        const row: Row = {};
        for (const column of this._columns) {
            row[column.getName()] = column.getRowValue(rowIndex);
        }

        return row;
    }

    filterRowsByColumn(columnName: string, predicate: (value: string | number | EnsembleIdent) => boolean): Row[] {
        const columnIndex = this._columns.findIndex((column) => column.getName() === columnName);

        if (columnIndex === -1) {
            throw new Error(`Column not found: ${columnName}`);
        }

        const column = this._columns[columnIndex];
        const rows = column.getRowsWhere(predicate);

        return rows.map((row) => this.getRow(row.index));
    }

    splitByColumn(columnName: string, keepColumn: boolean = false): TableCollection {
        const columnIndex = this._columns.findIndex((column) => column.getName() === columnName);

        if (columnIndex === -1) {
            throw new Error(`Column not found: ${columnName}`);
        }

        const column = this._columns[columnIndex];
        const uniqueValues = column.getUniqueValues();
        const numCols = this.getNumColumns();

        const tables: Table[] = [];
        for (const value of uniqueValues) {
            const rows = this.filterRowsByColumn(columnName, (v) => v === value);
            const columns: Column[] = [];
            for (let i = 0; i < numCols; i++) {
                if (i === columnIndex && !keepColumn) {
                    continue;
                }

                const newColumn = this._columns[i].cloneEmpty();
                for (const row of rows) {
                    newColumn.addRowValue(row[newColumn.getName()]);
                }
                columns.push(newColumn);
            }
            tables.push(new Table(columns));
        }

        return new TableCollection(columnName, uniqueValues, tables);
    }
}
