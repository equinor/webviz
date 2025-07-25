import type { InplaceVolumesStatistic_api } from "@api";
import type { EnsembleSet } from "@framework/EnsembleSet";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { TableHeading, TableRow } from "@lib/components/Table/table";
import { makeDistinguishableEnsembleDisplayName } from "@modules/_shared/ensembleNameUtils";
import { sortResultNameStrings } from "@modules/_shared/InplaceVolumes/sortResultNames";
import type { Column, Row } from "@modules/_shared/InplaceVolumes/Table";
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
import { createScaledNumberWithSuffix } from "@modules/_shared/utils/numberSuffixFormatting";

export function createTableHeadingsAndRowsFromTablesData(
    tablesData: InplaceVolumesTableData[],
    ensembleSet: EnsembleSet,
): {
    headings: TableHeading;
    rows: TableRow<any>[];
} {
    const tableHeadings: TableHeading = {};
    const tableRows: TableRow<any>[] = [];

    const dataTable = makeTableFromApiData(tablesData);
    for (const column of dataTable.getColumns()) {
        tableHeadings[column.getName()] = {
            label: column.getName(),
            hoverText: createHoverTextForVolume(column.getName()),
            sizeInPercent: 100 / dataTable.getNumColumns(),
            formatValue: makeValueFormattingFunc(column, ensembleSet),
            formatStyle: makeStyleFormattingFunc(column),
        };
    }

    for (const row of dataTable.getRows()) {
        tableRows.push(row);
    }

    return { headings: tableHeadings, rows: tableRows };
}

export function createStatisticalTableHeadingsAndRowsFromTablesData(
    tablesData: InplaceVolumesStatisticalTableData[],
    statisticOptions: InplaceVolumesStatistic_api[],
    ensembleSet: EnsembleSet,
): {
    headings: TableHeading;
    rows: TableRow<any>[];
} {
    const tableHeadings: TableHeading = {};
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
            sizeInPercent: nonStatisticalColumnSizePercentage / numNonStatisticalColumns,
            formatValue: makeValueFormattingFunc(column, ensembleSet),
            formatStyle: makeStyleFormattingFunc(column),
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

        const subHeading: TableHeading = {};
        resultStatisticalTable.getColumns().forEach((column) => {
            const columnSize = 100 / numStatisticOptions; // Size relative to parent heading (i.e. resultName)
            const columnId = `${resultName}-${column.getName()}`;
            subHeading[columnId] = {
                label: column.getName(),
                hoverText: `${column.getName()} - ${resultHoverText}`,
                sizeInPercent: columnSize,
                formatValue: makeValueFormattingFunc(column, ensembleSet),
                formatStyle: makeStyleFormattingFunc(column),
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
        tableRows.push(row);
    }

    return { headings: tableHeadings, rows: tableRows };
}

function makeStyleFormattingFunc(column: Column): ((value: number | string | null) => React.CSSProperties) | undefined {
    if (column.getType() === ColumnType.FLUID) {
        return (value: number | string | null) => {
            const style: React.CSSProperties = { textAlign: "right", fontWeight: "bold" };

            if (value?.toString().toLowerCase() === "oil") {
                style.color = "#0b8511";
            }
            if (value?.toString().toLowerCase() === "water") {
                style.color = "#0c24ab";
            }
            if (value?.toString().toLowerCase() === "gas") {
                style.color = "#ab110c";
            }

            return style;
        };
    }

    if (column.getType() === ColumnType.ENSEMBLE) {
        return undefined;
    }

    return () => ({ textAlign: "right" });
}

function makeValueFormattingFunc(
    column: Column,
    ensembleSet: EnsembleSet,
): ((value: number | string | null) => string) | undefined {
    if (column.getType() === ColumnType.ENSEMBLE) {
        return (value: number | string | null) => formatEnsembleIdent(value, ensembleSet);
    }
    if (column.getType() === ColumnType.RESULT) {
        return formatResultValue;
    }

    return undefined;
}

function formatEnsembleIdent(value: string | number | null, ensembleSet: EnsembleSet): string {
    if (value === null) {
        return "-";
    }
    const ensemble = ensembleSet.findEnsembleByIdentString(value.toString());
    if (ensemble && ensemble instanceof RegularEnsemble) {
        return makeDistinguishableEnsembleDisplayName(
            RegularEnsembleIdent.fromString(value.toString()),
            ensembleSet.getRegularEnsembleArray(),
        );
    }
    return value.toString();
}

function formatResultValue(value: string | number | null): string {
    // If properties cannot be calculated,
    // e.g. due to a 0 denominator, the value returned from backend will be null
    if (value === null) {
        return "-";
    }

    if (typeof value === "string") {
        return value;
    }

    const { scaledValue, suffix } = createScaledNumberWithSuffix(value);

    // Determine the number of decimal places based on the value's magnitude
    let decimalPlaces = 2;
    if (Math.abs(scaledValue) < 0.01) {
        decimalPlaces = 4;
    } else if (Math.abs(scaledValue) < 0.1) {
        decimalPlaces = 3;
    }

    return `${scaledValue.toFixed(decimalPlaces)} ${suffix}`;
}
