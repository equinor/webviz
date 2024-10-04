import { InplaceVolumetricStatistic_api } from "@api";

import { Column, ColumnType, Table } from "./Table";
import {
    InplaceVolumetricStatisticEnumToStringMapping,
    InplaceVolumetricsStatisticalTableData,
    InplaceVolumetricsTableData,
    SourceIdentifier,
    StatisticalColumns,
    StatisticalTableColumnData,
} from "./types";

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

export function makeStatisticalTableColumnDataFromApiData(
    data: InplaceVolumetricsStatisticalTableData[],
    statisticOptions: InplaceVolumetricStatistic_api[]
): StatisticalTableColumnData {
    // Result statistical tables
    const resultStatisticalColumns: Map<string, StatisticalColumns> = new Map();

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
                if (resultStatisticalColumns.has(resultColumn.columnName)) {
                    continue;
                }

                // Add statistical columns for each result column based on the selected statistic options
                const statisticalColumns: StatisticalColumns = {};
                for (const statistic of statisticOptions) {
                    const columnName = InplaceVolumetricStatisticEnumToStringMapping[statistic];
                    statisticalColumns[statistic] = new Column<number>(columnName, ColumnType.RESULT);
                }
                resultStatisticalColumns.set(resultColumn.columnName, statisticalColumns);
            }
        }
    }

    // Add row values to the tables
    for (const tableSet of data) {
        for (const fluidZoneTableData of tableSet.data.tableDataPerFluidSelection) {
            const hasNoResultColumnStatistics =
                fluidZoneTableData.resultColumnStatistics.length === 0 ||
                Object.keys(fluidZoneTableData.resultColumnStatistics[0].statisticValues).length === 0;
            if (hasNoResultColumnStatistics) {
                continue;
            }

            // Number of rows from the first result statistic column
            const numRows = Object.values(fluidZoneTableData.resultColumnStatistics[0].statisticValues)[0].length;
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
                for (const valueIndex of selectorColumn.indices) {
                    const rowValue = selectorColumn.uniqueValues.at(valueIndex);
                    if (!rowValue) {
                        throw new Error(
                            `Expected value at index ${valueIndex} for ${selectorColumn.columnName} not found`
                        );
                    }

                    nonStatisticalColumns.get(selectorColumn.columnName)?.addRowValue(rowValue);
                }
            }

            // Fill in untouched selector columns with null
            for (const untouchedColumn of untouchedSelectorColumns) {
                for (let i = 0; i < numRows; i++) {
                    nonStatisticalColumns.get(untouchedColumn)?.addRowValue(null);
                }
            }

            // Build statistical columns per result across each unique table set
            const resultStatisticsInTableData = fluidZoneTableData.resultColumnStatistics.map(
                (resultColumn) => resultColumn.columnName
            );
            const untouchedResultStatistics = Array.from(resultStatisticalColumns.keys()).filter(
                (elm) => !resultStatisticsInTableData.includes(elm)
            );
            for (const resultColumn of fluidZoneTableData.resultColumnStatistics) {
                const statisticalColumns = resultStatisticalColumns.get(resultColumn.columnName);

                if (!statisticalColumns) {
                    throw new Error(`Expected statistical columns for ${resultColumn.columnName} not found`);
                }

                statisticalColumns.mean?.addRowValues(resultColumn.statisticValues["mean"]);
                statisticalColumns.stddev?.addRowValues(resultColumn.statisticValues["stddev"]);
                statisticalColumns.p90?.addRowValues(resultColumn.statisticValues["p90"]);
                statisticalColumns.p10?.addRowValues(resultColumn.statisticValues["p10"]);
                statisticalColumns.min?.addRowValues(resultColumn.statisticValues["min"]);
                statisticalColumns.max?.addRowValues(resultColumn.statisticValues["max"]);
            }

            // Fill in untouched results with null for statistics
            const nullArray = Array(numRows).fill(null);
            for (const untouchedResult of untouchedResultStatistics) {
                const statisticalColumns = resultStatisticalColumns.get(untouchedResult);

                if (!statisticalColumns) {
                    throw new Error(`Expected statistical columns for ${untouchedResult} not found`);
                }

                for (const keyStr of Object.keys(statisticalColumns)) {
                    const key = keyStr as InplaceVolumetricStatistic_api;
                    statisticalColumns[key]?.addRowValues(nullArray);
                }
            }
        }
    }

    return {
        nonStatisticalColumns: Array.from(nonStatisticalColumns.values()),
        resultStatisticalColumns: resultStatisticalColumns,
    };
}
