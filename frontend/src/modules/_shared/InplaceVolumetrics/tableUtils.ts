import { Column, ColumnType, Table } from "./Table";
import { InplaceVolumetricsTableData, SourceIdentifier } from "./types";

export function makeTableFromApiData(data: InplaceVolumetricsTableData[]): Table {
    const columns: Map<string, Column<any>> = new Map();
    columns.set("ensemble", new Column<string>(SourceIdentifier.ENSEMBLE, ColumnType.ENSEMBLE));
    columns.set("table", new Column<string>(SourceIdentifier.TABLE_NAME, ColumnType.TABLE));
    columns.set("fluid-zone", new Column<string>(SourceIdentifier.FLUID_ZONE, ColumnType.FLUID_ZONE));

    for (const tableSet of data) {
        for (const fluidZoneTable of tableSet.data.tablePerFluidSelection) {
            let mainColumnsAdded = false;
            for (const selectorColumn of fluidZoneTable.selectorColumns) {
                if (!columns.has(selectorColumn.columnName)) {
                    let type = ColumnType.IDENTIFIER;
                    if (selectorColumn.columnName === "REAL") {
                        type = ColumnType.REAL;
                    }
                    columns.set(selectorColumn.columnName, new Column(selectorColumn.columnName, type));
                }

                for (let i = 0; i < selectorColumn.indices.length; i++) {
                    columns
                        .get(selectorColumn.columnName)
                        ?.addRowValue(selectorColumn.uniqueValues[selectorColumn.indices[i]]);

                    if (!mainColumnsAdded) {
                        columns.get("ensemble")?.addRowValue(tableSet.ensembleIdent);
                        columns.get("table")?.addRowValue(tableSet.tableName);
                        columns.get("fluid-zone")?.addRowValue(fluidZoneTable.fluidSelectionName);
                    }
                }
                mainColumnsAdded = true;
            }
            for (const resultColumn of fluidZoneTable.resultColumns) {
                if (!columns.has(resultColumn.columnName)) {
                    columns.set(resultColumn.columnName, new Column(resultColumn.columnName, ColumnType.RESULT));
                }
                for (const value of resultColumn.columnValues) {
                    columns.get(resultColumn.columnName)?.addRowValue(value);

                    if (!mainColumnsAdded) {
                        columns.get("ensemble")?.addRowValue(tableSet.ensembleIdent);
                        columns.get("table")?.addRowValue(tableSet.tableName);
                        columns.get("fluid-zone")?.addRowValue(fluidZoneTable.fluidSelectionName);
                    }
                }
                mainColumnsAdded = true;
            }
        }
    }

    return new Table(Array.from(columns.values()));
}
