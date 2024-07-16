import { Column, ColumnType, Table } from "./Table";
import { InplaceVolumetricsTableData } from "./types";

export function makeTableFromApiData(data: InplaceVolumetricsTableData[]): Table {
    const columns: Map<string, Column<any>> = new Map();
    columns.set("ensemble", new Column<string>("Ensemble", ColumnType.ENSEMBLE));
    columns.set("table", new Column<string>("Table", ColumnType.TABLE));
    columns.set("fluid-zone", new Column<string>("Fluid Zone", ColumnType.FLUID_ZONE));

    for (const tableSet of data) {
        for (const fluidZoneTable of tableSet.data.tablePerFluidSelection) {
            let mainColumnsAdded = false;
            for (const selectorColumn of fluidZoneTable.selectorColumns) {
                if (!columns.has(selectorColumn.columnName)) {
                    let type = ColumnType.IDENTIFIER;
                    if (selectorColumn.columnName === "REAL") {
                        type = ColumnType.REAL;
                    }
                    columns.set(
                        selectorColumn.columnName,
                        new Column(selectorColumn.columnName, type, selectorColumn.uniqueValues, selectorColumn.indices)
                    );

                    if (!mainColumnsAdded) {
                        mainColumnsAdded = true;
                        for (let i = 0; i < selectorColumn.indices.length; i++) {
                            columns.get("ensemble")?.addRowValue(tableSet.ensembleIdent);
                            columns.get("table")?.addRowValue(tableSet.tableName);
                            columns.get("fluid-zone")?.addRowValue(fluidZoneTable.fluidSelectionName);
                        }
                    }
                }
            }
            for (const resultColumn of fluidZoneTable.resultColumns) {
                if (!columns.has(resultColumn.columnName)) {
                    columns.set(resultColumn.columnName, new Column(resultColumn.columnName, ColumnType.RESULT));
                }
                for (const value of resultColumn.columnValues) {
                    columns.get(resultColumn.columnName)?.addRowValue(value);
                }
                if (!mainColumnsAdded) {
                    mainColumnsAdded = true;
                    for (let i = 0; i < resultColumn.columnValues.length; i++) {
                        columns.get("ensemble")?.addRowValue(tableSet.ensembleIdent);
                        columns.get("table")?.addRowValue(tableSet.tableName);
                        columns.get("fluid-zone")?.addRowValue(fluidZoneTable.fluidSelectionName);
                    }
                }
            }
        }
    }

    return new Table(Array.from(columns.values()));
}
