import { Column, ColumnType, Table } from "./Table";
import { InplaceVolumetricsStatisticalTableData, InplaceVolumetricsTableData, SourceIdentifier } from "./types";

export function makeTableFromApiData(data: InplaceVolumetricsTableData[]): Table {
    const columns: Map<string, Column<any>> = new Map();
    columns.set("ensemble", new Column<string>(SourceIdentifier.ENSEMBLE, ColumnType.ENSEMBLE));
    columns.set("table", new Column<string>(SourceIdentifier.TABLE_NAME, ColumnType.TABLE));
    columns.set("fluid-zone", new Column<string>(SourceIdentifier.FLUID_ZONE, ColumnType.FLUID_ZONE));

    // First, collect all columns
    for (const tableSet of data) {
        for (const fluidZoneTable of tableSet.data.tableDataPerFluidSelection) {
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
        for (const fluidZoneTable of tableSet.data.tableDataPerFluidSelection) {
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

export type StatisticalTablesType = {
    // Each Table object is intended to have equal number of rows.
    // - nonStatisticalColumnsTable: Non statistical columns table has columns for e.g.  ensemble, table, fluid-zone, and selector columns.
    // - resultStatisticalColumnsTables: Map of string and Table for result statistical columns. Key is name of result, value is Table with statistical columns.

    nonStatisticalColumnsTable: Table;
    resultStatisticalColumnsTables: Map<string, Table>;
};

// Define a type which has one Table object for selectorColumns and a map of string and Table for resultStatisticalColumns

export function makeStatisticalTablesFromApiData(
    data: InplaceVolumetricsStatisticalTableData[]
): StatisticalTablesType {
    // Result statistical tables
    const resultStatisticalColumnsTables: Map<string, Table> = new Map();

    // Non-statistical columns
    const allSelectorColumns: Set<string> = new Set();
    const nonStatisticalColumns: Map<string, Column<any>> = new Map();

    // Columns to always exist (non-statistical, but no selector columns)
    nonStatisticalColumns.set("ensemble", new Column<string>(SourceIdentifier.ENSEMBLE, ColumnType.ENSEMBLE));
    nonStatisticalColumns.set("table", new Column<string>(SourceIdentifier.TABLE_NAME, ColumnType.TABLE));
    nonStatisticalColumns.set("fluid-zone", new Column<string>(SourceIdentifier.FLUID_ZONE, ColumnType.FLUID_ZONE));

    // Find union of selector columns and result columns
    for (const tableSet of data) {
        for (const fluidZoneTableData of tableSet.data.tableDataPerFluidSelection) {
            // Selector columns
            for (const selectorColumn of fluidZoneTableData.selectorColumns) {
                allSelectorColumns.add(selectorColumn.columnName);
                if (!nonStatisticalColumns.has(selectorColumn.columnName)) {
                    const type = ColumnType.IDENTIFIER;
                    if (selectorColumn.columnName === "REAL") {
                        throw new Error("REAL column should not be present in statistical tables");
                    }
                    nonStatisticalColumns.set(selectorColumn.columnName, new Column(selectorColumn.columnName, type));
                }
            }

            // Result statistical tables
            for (const resultColumn of fluidZoneTableData.resultColumnStatistics) {
                if (resultStatisticalColumnsTables.has(resultColumn.columnName)) {
                    continue;
                }

                const statisticalColumns: Map<string, Column<any>> = new Map();
                statisticalColumns.set("Mean", new Column<number>("Mean", ColumnType.RESULT));
                statisticalColumns.set("Stddev", new Column<number>("Stddev", ColumnType.RESULT));
                statisticalColumns.set("P90", new Column<number>("P90", ColumnType.RESULT));
                statisticalColumns.set("P10", new Column<number>("P10", ColumnType.RESULT));
                statisticalColumns.set("Min", new Column<number>("Min", ColumnType.RESULT));
                statisticalColumns.set("Max", new Column<number>("Max", ColumnType.RESULT));

                resultStatisticalColumnsTables.set(
                    resultColumn.columnName,
                    new Table(Array.from(statisticalColumns.values()))
                );
            }
        }
    }

    // Add row values to the tables
    for (const tableSet of data) {
        for (const fluidZoneTableData of tableSet.data.tableDataPerFluidSelection) {
            // Add main columns
            // const firstKey = fluidZoneTableData.resultColumnStatistics[0].statisticValues
            if (fluidZoneTableData.resultColumnStatistics.length === 0) {
                continue;
            }

            const numRows = fluidZoneTableData.resultColumnStatistics[0].statisticValues["min"].length; // TODO: Fix correct numRows
            for (let i = 0; i < numRows; i++) {
                nonStatisticalColumns.get("ensemble")?.addRowValue(tableSet.ensembleIdent);
                nonStatisticalColumns.get("table")?.addRowValue(tableSet.tableName);
                nonStatisticalColumns.get("fluid-zone")?.addRowValue(fluidZoneTableData.fluidSelectionName);
            }

            // Build selector columns
            const selectorColumnsInTable = fluidZoneTableData.selectorColumns.map(
                (selectorColumn) => selectorColumn.columnName
            );
            const untouchedSelectorColumns = Array.from(allSelectorColumns).filter(
                (elm) => !selectorColumnsInTable.includes(elm)
            );
            for (const selectorColumn of fluidZoneTableData.selectorColumns) {
                for (let i = 0; i < selectorColumn.indices.length; i++) {
                    nonStatisticalColumns
                        .get(selectorColumn.columnName)
                        ?.addRowValue(selectorColumn.uniqueValues[selectorColumn.indices[i]]);
                }
            }

            // Fill in untouched columns with null
            for (const untouchedColumn of untouchedSelectorColumns) {
                for (let i = 0; i < numRows; i++) {
                    nonStatisticalColumns.get(untouchedColumn)?.addRowValue(null);
                }
            }

            // Build statistical table per result
            const resultStatisticsInTableData = fluidZoneTableData.resultColumnStatistics.map(
                (resultColumn) => resultColumn.columnName
            );
            const untouchedResultStatistics = Array.from(resultStatisticalColumnsTables.keys()).filter(
                (elm) => !resultStatisticsInTableData.includes(elm)
            );
            for (const resultColumn of fluidZoneTableData.resultColumnStatistics) {
                const table = resultStatisticalColumnsTables.get(resultColumn.columnName);

                if (!table) {
                    throw new Error(`Expected statistical table for ${resultColumn.columnName} not found`);
                }

                table?.getColumn("Mean")?.addRowValues(resultColumn.statisticValues["mean"]);
                table?.getColumn("Stddev")?.addRowValues(resultColumn.statisticValues["stddev"]);
                table?.getColumn("P90")?.addRowValues(resultColumn.statisticValues["p90"]);
                table?.getColumn("P10")?.addRowValues(resultColumn.statisticValues["p10"]);
                table?.getColumn("Min")?.addRowValues(resultColumn.statisticValues["min"]);
                table?.getColumn("Max")?.addRowValues(resultColumn.statisticValues["max"]);
            }

            // Fill in untouched results with null for statistics
            const nullArray = Array(numRows).fill(null);
            for (const untouchedResult of untouchedResultStatistics) {
                const table = resultStatisticalColumnsTables.get(untouchedResult);

                if (!table) {
                    throw new Error(`Expected statistical table for ${untouchedResult} not found`);
                }

                table?.getColumns().forEach((column) => column.addRowValues(nullArray));
            }
        }
    }

    return {
        nonStatisticalColumnsTable: new Table(Array.from(nonStatisticalColumns.values())),
        resultStatisticalColumnsTables: resultStatisticalColumnsTables,
    };
}
