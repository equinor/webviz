import React from "react";

import { Table } from "@lib/components/Table";
import type { TableSortState } from "@lib/components/Table/typesAndEnums";
import { SortDirection } from "@lib/components/Table/typesAndEnums";
import type { SensitivityResponseDataset } from "@modules/_shared/SensitivityProcessing";

import {
    makeSensitivityTableRows,
    sortSensitivityTableRows,
    type SensitivityTableRow,
} from "../utils/sensitivityTableRows";

export interface SensitivityTableProps {
    datasets: SensitivityResponseDataset[];
}

type ColumnDef = {
    key: keyof SensitivityTableRow;
    label: string;
    widthInPercent: number;
    isAverage?: boolean;
};

const COLUMNS: ColumnDef[] = [
    { key: "response", label: "Response", widthInPercent: 14 },
    { key: "sensitivity", label: "Sensitivity", widthInPercent: 14 },
    { key: "type", label: "Type", widthInPercent: 8 },
    { key: "mean", label: "Mean", widthInPercent: 8, isAverage: true },
    { key: "p90", label: "P90", widthInPercent: 8, isAverage: true },
    { key: "p10", label: "P10", widthInPercent: 8, isAverage: true },
    { key: "avgLow", label: "Avg low", widthInPercent: 8, isAverage: true },
    { key: "avgHigh", label: "Avg high", widthInPercent: 8, isAverage: true },
    { key: "totalReals", label: "Total reals", widthInPercent: 8 },
    { key: "realsLow", label: "Reals low", widthInPercent: 8 },
    { key: "realsHigh", label: "Reals high", widthInPercent: 8 },
];

const NUMBER_FORMAT = Intl.NumberFormat("en", {
    notation: "compact",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

function formatCell(column: ColumnDef, value: string | number | null): string {
    if (value === null) {
        return "";
    }
    return column.isAverage && typeof value === "number" ? NUMBER_FORMAT.format(value) : String(value);
}

function getCommonUnit(datasets: SensitivityResponseDataset[]): string | null {
    const units = new Set(datasets.map((dataset) => dataset.responseUnit ?? ""));
    const [unit] = units;
    return units.size === 1 && unit ? unit : null;
}

const SensitivityTable: React.FC<SensitivityTableProps> = ({ datasets }) => {
    const [columnSorting, setColumnSorting] = React.useState<TableSortState | null>(null);

    const rows = makeSensitivityTableRows(datasets);
    const sortedRows =
        !columnSorting || columnSorting.direction === SortDirection.NONE
            ? rows
            : sortSensitivityTableRows(
                  rows,
                  columnSorting.columnKey as keyof SensitivityTableRow,
                  columnSorting.direction,
              );
    const unit = getCommonUnit(datasets);

    return (
        <div className="h-full">
            <Table.Root
                size="small"
                sortable
                columnSorting={columnSorting}
                onChangeColumnSort={setColumnSorting}
                compact
            >
                <Table.Head>
                    {COLUMNS.map((column) => (
                        <Table.Column key={column.key} colKey={column.key} widthInPercent={column.widthInPercent}>
                            {column.isAverage && unit ? `${column.label} [${unit}]` : column.label}
                        </Table.Column>
                    ))}
                </Table.Head>
                <Table.Body>
                    {sortedRows.map((row) => (
                        <Table.Row key={row.key} rowKey={row.key}>
                            {COLUMNS.map((column) => (
                                <Table.Cell key={column.key}>{formatCell(column, row[column.key])}</Table.Cell>
                            ))}
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table.Root>
        </div>
    );
};

export default SensitivityTable;
