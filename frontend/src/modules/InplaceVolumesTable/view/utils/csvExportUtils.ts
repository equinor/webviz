import type { EnsembleSet } from "@framework/EnsembleSet";
import type { CsvRows } from "@lib/utils/csvConvertUtils";
import { ColumnType } from "@modules/_shared/InplaceVolumes/Table";

import type { TableColumnsConfig, TableHeading, TableRow } from "../types";

import { collectLeafColumns, formatEnsembleIdent } from "./tableComponentUtils";

export const HEADER_PATH_SEPARATOR = "_";

function toCsvCell(value: string | number | null, heading: TableHeading, ensembleSet: EnsembleSet): string | number {
    if (value === null || value === undefined) {
        return "";
    }
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : "";
    }
    if (heading.columnType === ColumnType.ENSEMBLE) {
        return formatEnsembleIdent(value, ensembleSet);
    }
    return value;
}

export function buildCsvRowsFromTable(
    columnsConfig: TableColumnsConfig,
    rows: TableRow<TableColumnsConfig>[],
    ensembleSet: EnsembleSet,
): CsvRows {
    const leaves = collectLeafColumns(columnsConfig);
    if (leaves.length === 0) {
        return { headerRows: [[]], dataRows: [] };
    }

    const headers = leaves.map((leaf) => leaf.labelPath.join(HEADER_PATH_SEPARATOR));
    if (new Set(headers).size !== headers.length) {
        console.warn("Duplicate CSV headers", headers);
    }

    const dataRows = rows.map((row) => leaves.map((leaf) => toCsvCell(row[leaf.key], leaf.heading, ensembleSet)));

    return { headerRows: [headers], dataRows };
}
