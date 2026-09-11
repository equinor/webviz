import { v4 } from "uuid";

import type { InplaceVolumesStatistic_api } from "@api";
import type { EnsembleSet } from "@framework/EnsembleSet";
import { getEnsembleIdentFromString } from "@framework/utils/ensembleIdentUtils";
import { PHASE_COLORS } from "@modules/_shared/constants/colors";
import { makeDistinguishableEnsembleDisplayName } from "@modules/_shared/ensembleNameUtils";
import { sortResultNameStrings } from "@modules/_shared/InplaceVolumes/sortResultNames";
import type { Row } from "@modules/_shared/InplaceVolumes/Table";
import { ColumnType, Table } from "@modules/_shared/InplaceVolumes/Table";
import {
    makeStatisticalTableColumnDataFromApiData,
    makeTableFromApiData,
} from "@modules/_shared/InplaceVolumes/tableUtils";
import type {
    InplaceVolumesStatisticalTableData,
    InplaceVolumesTableData,
} from "@modules/_shared/InplaceVolumes/types";
import { createHoverTextForVolume } from "@modules/_shared/InplaceVolumes/volumeStringUtils";

import type { TableColumnsConfig, TableRow } from "../types";

/**
 * Sorts rows by non-result columns in heading order. Index columns use the preferred category order;
 * other columns retain their first-seen order, preserving higher-level table grouping.
 */
export function sortTableRowsByCategoryOrder<TColumns extends TableColumnsConfig>(
    rows: TableRow<TColumns>[],
    headings: TColumns,
    categoryOrder: ReadonlyMap<string, readonly string[]>,
): TableRow<TColumns>[] {
    const categoryColumns = Object.entries(headings)
        .filter(([, heading]) => heading.columnType !== undefined && heading.columnType !== ColumnType.RESULT)
        .map(([columnName]) => columnName);

    const positionsByColumn = new Map<string, Map<string, number>>();
    for (const columnName of categoryColumns) {
        const preferredValues = categoryOrder.get(columnName);
        const values = preferredValues ?? Array.from(new Set(rows.map((row) => String(row[columnName]))));
        positionsByColumn.set(columnName, new Map(values.map((value, index) => [value, index])));
    }

    return rows.toSorted((left, right) => {
        for (const columnName of categoryColumns) {
            const positions = positionsByColumn.get(columnName);
            const leftPosition = positions?.get(String(left[columnName])) ?? Number.MAX_SAFE_INTEGER;
            const rightPosition = positions?.get(String(right[columnName])) ?? Number.MAX_SAFE_INTEGER;
            if (leftPosition !== rightPosition) {
                return leftPosition - rightPosition;
            }
        }
        return 0;
    });
}

export function createTableHeadingsAndRowsFromTablesData(tablesData: InplaceVolumesTableData[]): {
    headings: TableColumnsConfig;
    rows: TableRow<any>[];
} {
    const tableHeadings: TableColumnsConfig = {};
    const tableRows: TableRow<any>[] = [];

    const dataTable = makeTableFromApiData(tablesData);
    for (const column of dataTable.getColumns()) {
        tableHeadings[column.getName()] = {
            columnType: column.getType(),
            label: column.getName(),
            hoverText: createHoverTextForVolume(column.getName()),
            sizeInPercent: 100 / dataTable.getNumColumns(),
        };
    }

    for (const row of dataTable.getRows()) {
        tableRows.push({ __id: v4(), ...row });
    }

    return { headings: tableHeadings, rows: tableRows };
}

export function createStatisticalTableHeadingsAndRowsFromTablesData(
    tablesData: InplaceVolumesStatisticalTableData[],
    statisticOptions: InplaceVolumesStatistic_api[],
): {
    headings: TableColumnsConfig;
    rows: TableRow<any>[];
} {
    const tableHeadings: TableColumnsConfig = {};
    const tableRows: TableRow<any>[] = [];

    const columnData = makeStatisticalTableColumnDataFromApiData(tablesData, statisticOptions);

    const nonStatisticalColumns = columnData.nonStatisticalColumns;
    const resultStatisticalColumns = columnData.resultStatisticalColumns;

    const numNonStatisticalColumns = nonStatisticalColumns.length;
    const numStatisticalResultColumns = resultStatisticalColumns.size;
    const numStatisticOptions = statisticOptions.length;

    // Give non-statistical columns a total width of 40%
    const nonStatisticalColumnSizePercentage = 40;
    const statisticalColumnSizePercentage = 100 - nonStatisticalColumnSizePercentage;

    // Headings for non-statistical columns
    for (const column of nonStatisticalColumns) {
        tableHeadings[column.getName()] = {
            label: column.getName(),
            columnType: column.getType(),
            sizeInPercent: nonStatisticalColumnSizePercentage / numNonStatisticalColumns,
        };
    }

    // Initialize rows using non-statistical columns
    const rows: Row[] = [];
    const nonStatisticalColumnsTable = new Table(nonStatisticalColumns);
    for (const row of nonStatisticalColumnsTable.getRows()) {
        rows.push(row);
    }

    const numberOfRows = rows.length;

    // Headings and row data for result statistical columns
    const sortedResultNames = sortResultNameStrings(Array.from(resultStatisticalColumns.keys()));
    for (const resultName of sortedResultNames) {
        const statisticalColumns = resultStatisticalColumns.get(resultName);
        if (!statisticalColumns) {
            throw new Error(`Statistical columns for result ${resultName} not found.`);
        }

        // Create table object for easier access to columns and rows
        const resultStatisticalTable = new Table(Object.values(statisticalColumns));

        const resultHoverText = createHoverTextForVolume(resultName);

        const subHeading: TableColumnsConfig = {};
        resultStatisticalTable.getColumns().forEach((column) => {
            const columnSize = 100 / numStatisticOptions; // Size relative to parent heading (i.e. resultName)
            const columnId = `${resultName}-${column.getName()}`;
            subHeading[columnId] = {
                label: column.getName(),
                columnType: column.getType(),
                hoverText: `${column.getName()} - ${resultHoverText}`,
                sizeInPercent: columnSize,
            };
        });

        tableHeadings[resultName] = {
            label: resultName,
            hoverText: resultHoverText,
            sizeInPercent: statisticalColumnSizePercentage / numStatisticalResultColumns,
            subHeading: subHeading,
        };

        if (resultStatisticalTable.getNumRows() > 0 && numberOfRows !== resultStatisticalTable.getNumRows()) {
            throw new Error(
                "Number of rows in statistical table does not match the number of rows in the non-statistical table.",
            );
        }

        for (let i = 0; i < resultStatisticalTable.getNumRows(); i++) {
            const statisticalRow = resultStatisticalTable.getRow(i);

            // Add resultName as prefix to column names
            for (const column of resultStatisticalTable.getColumns()) {
                const columnId = `${resultName}-${column.getName()}`;
                rows[i][columnId] = statisticalRow[column.getName()];
            }
        }
    }

    // Add rows to tableRows
    for (const row of rows) {
        tableRows.push({ __id: v4(), ...row });
    }

    return { headings: tableHeadings, rows: tableRows };
}
export function isValidFluidType(type: string): type is keyof typeof PHASE_COLORS {
    return type in PHASE_COLORS;
}
export function formatEnsembleIdent(value: string | number | null, ensembleSet: EnsembleSet): string {
    if (value === null) {
        return "-";
    }
    const ensembleIdent = getEnsembleIdentFromString(value.toString());
    if (ensembleIdent && ensembleSet.findEnsemble(ensembleIdent)) {
        return makeDistinguishableEnsembleDisplayName(ensembleIdent, ensembleSet.getEnsembleArray());
    }
    return value.toString();
}
