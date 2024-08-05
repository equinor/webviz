import { Column, ColumnType, Table } from "./Table";
import { InplaceVolumetricsTableData, SourceIdentifier } from "./types";

export function makeTableFromApiData(data: InplaceVolumetricsTableData[]): Table {
    const columns: Map<string, Column<any>> = new Map();
    columns.set("ensemble", new Column<string>(SourceIdentifier.ENSEMBLE, ColumnType.ENSEMBLE));
    columns.set("table", new Column<string>(SourceIdentifier.TABLE_NAME, ColumnType.TABLE));
    columns.set("fluid-zone", new Column<string>(SourceIdentifier.FLUID_ZONE, ColumnType.FLUID_ZONE));

    // First, collect all columns
    for (const tableSet of data) {
        for (const fluidZoneTable of tableSet.data.tablePerFluidSelection) {
            for (const selectorColumn of fluidZoneTable.selectorColumns) {
                if (!columns.has(selectorColumn.columnName)) {
                    let type = ColumnType.IDENTIFIER;
                    if (selectorColumn.columnName === "REAL") {
                        type = ColumnType.REAL;
                    }
                    columns.set(selectorColumn.columnName, new Column(selectorColumn.columnName, type));
                }
            }
            for (const resultColumn of fluidZoneTable.resultColumns) {
                if (!columns.has(resultColumn.columnName)) {
                    columns.set(resultColumn.columnName, new Column(resultColumn.columnName, ColumnType.RESULT));
                }
            }
        }
    }

    // Then, add the values to the columns
    for (const tableSet of data) {
        for (const fluidZoneTable of tableSet.data.tablePerFluidSelection) {
            let mainColumnsAdded = false;
            for (const selectorColumn of fluidZoneTable.selectorColumns) {
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

            let numAddedRows = 0;
            for (const [index, resultColumn] of fluidZoneTable.resultColumns.entries()) {
                for (const value of resultColumn.columnValues) {
                    columns.get(resultColumn.columnName)?.addRowValue(value);

                    if (index === 0) {
                        numAddedRows++;
                    }

                    if (!mainColumnsAdded) {
                        columns.get("ensemble")?.addRowValue(tableSet.ensembleIdent);
                        columns.get("table")?.addRowValue(tableSet.tableName);
                        columns.get("fluid-zone")?.addRowValue(fluidZoneTable.fluidSelectionName);
                    }
                }
                mainColumnsAdded = true;
            }
            if (numAddedRows > 0) {
                const untouchedColumns = Array.from(columns.values()).filter(
                    (column) =>
                        !fluidZoneTable.selectorColumns.some(
                            (selectorColumn) => selectorColumn.columnName === column.getName()
                        ) &&
                        !fluidZoneTable.resultColumns.some(
                            (resultColumn) => resultColumn.columnName === column.getName()
                        ) &&
                        column.getType() !== ColumnType.ENSEMBLE &&
                        column.getType() !== ColumnType.TABLE &&
                        column.getType() !== ColumnType.FLUID_ZONE
                );
                for (const column of untouchedColumns) {
                    for (let i = 0; i < numAddedRows; i++) {
                        column.addRowValue(null);
                    }
                }
            }
        }
    }

    return new Table(Array.from(columns.values()));
}
