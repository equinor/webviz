import { InplaceVolumetricTableDataPerFluidSelection_api, InplaceVolumetricTableData_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";

import { InplaceVolumetricsTableData } from "./types";

export enum ColumnType {
    ENSEMBLE = "ensemble",
    TABLE = "table",
    FLUID_ZONE = "fluidZone",
    REAL = "real",
    IDENTIFIER = "identifier",
    RESULT = "result",
}

export type Column = {
    name: string;
    type: ColumnType;
};

export class InplaceVolumetricDataTable {
    private _ensembleIdent: EnsembleIdent;
    private _tableName: string;
    private _fluidZone: string;
    private _data: InplaceVolumetricTableData_api;
    private _identifierColumns: string[] = [];
    private _resultColumns: string[] = [];
    private _rowCount: number = 0;
    private _meanAcrossRealizations: boolean = true;
    private _realColumnIndex = -1;

    constructor(ensembleIdent: EnsembleIdent, tableName: string, data: InplaceVolumetricTableData_api) {
        this._ensembleIdent = ensembleIdent;
        this._tableName = tableName;
        this._data = data;
        this._fluidZone = data.fluidSelectionName;

        this.extractData();
    }

    private extractData(): void {
        const identifierColumns: Set<string> = new Set();
        const resultColumns: Set<string> = new Set();
        let rowCount = Number.MAX_SAFE_INTEGER;

        for (const [index, selectorColumn] of this._data.selectorColumns.entries()) {
            if (selectorColumn.columnName === "REAL") {
                this._meanAcrossRealizations = false;
                this._realColumnIndex = index;
                continue;
            }
            identifierColumns.add(selectorColumn.columnName);
            rowCount = Math.min(rowCount, selectorColumn.indices.length);
        }
        for (const resultColumn of this._data.resultColumns) {
            resultColumns.add(resultColumn.columnName);
            rowCount = Math.min(rowCount, resultColumn.columnValues.length);
        }

        this._identifierColumns = Array.from(identifierColumns);
        this._resultColumns = Array.from(resultColumns);
        this._rowCount = rowCount;
    }

    getIdentifierColumns(): string[] {
        return this._identifierColumns;
    }

    getResultColumns(): string[] {
        return this._resultColumns;
    }

    getRowCount(): number {
        return this._rowCount;
    }

    getColumnCount(): number {
        return this._identifierColumns.length + this._resultColumns.length + 2;
    }

    getColumns(): Column[] {
        const columns: Column[] = [
            { name: "Ensemble", type: ColumnType.ENSEMBLE },
            { name: "Table", type: ColumnType.TABLE },
            { name: "Fluid Zone", type: ColumnType.FLUID_ZONE },
        ];

        if (!this._meanAcrossRealizations) {
            columns.push({ name: "REAL", type: ColumnType.REAL });
        }

        for (const identifier of this._identifierColumns) {
            columns.push({ name: identifier, type: ColumnType.IDENTIFIER });
        }

        for (const result of this._resultColumns) {
            columns.push({ name: result, type: ColumnType.RESULT });
        }

        return columns;
    }

    getRow(rowIndex: number): Record<string, string | number> {
        const row: Record<string, string | number> = {
            Ensemble: this._ensembleIdent.toString(),
            Table: this._tableName,
            "Fluid Zone": this._fluidZone,
        };
        if (!this._meanAcrossRealizations) {
            row["REAL"] = this._data.selectorColumns[this._realColumnIndex].uniqueValues[rowIndex];
        }
        for (let i = 0; i < this._identifierColumns.length; i++) {
            const columnName = this._identifierColumns[i];
            const column = this._data.selectorColumns[i];
            const indexValue = column.indices[rowIndex];
            row[columnName] = column.uniqueValues[indexValue];
        }
        for (let i = 0; i < this._resultColumns.length; i++) {
            const columnName = this._resultColumns[i];
            const column = this._data.resultColumns[i];
            row[columnName] = column.columnValues[rowIndex];
        }
        return row;
    }

    getRows(): Record<string, string | number>[] {
        const rows: Record<string, string | number>[] = [];
        for (let i = 0; i < this._rowCount; i++) {
            rows.push(this.getRow(i));
        }
        return rows;
    }
}

export class InplaceVolumetricsTablesDataAccessor {
    private _tables: InplaceVolumetricDataTable[] = [];

    constructor(data: InplaceVolumetricsTableData[]) {
        this.makeTables(data);
    }

    private makeTables(data: InplaceVolumetricsTableData[]) {
        const tables: InplaceVolumetricDataTable[] = [];
        for (const tableSet of data) {
            for (const fluidZoneTable of tableSet.data.tablePerFluidSelection) {
                const table = new InplaceVolumetricDataTable(
                    tableSet.ensembleIdent,
                    tableSet.tableName,
                    fluidZoneTable
                );
                tables.push(table);
            }
        }
        this._tables = tables;
    }

    getColumnsUnion(): Column[] {
        const columns: Column[] = [];
        for (const table of this._tables) {
            for (const column of table.getColumns()) {
                if (!columns.some((el) => el.name === column.name)) {
                    columns.push(column);
                }
            }
        }
        return Array.from(columns);
    }

    getColumnsUnionCount(): number {
        return this.getColumnsUnion().length;
    }

    getTables(): InplaceVolumetricDataTable[] {
        return this._tables;
    }
}
