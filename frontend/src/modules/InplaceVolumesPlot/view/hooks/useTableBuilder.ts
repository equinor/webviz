import { useMemo } from "react";

import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { EnsembleSet } from "@framework/EnsembleSet";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { TableColumns } from "@lib/components/Table/types";
import type { TableRow } from "@lib/components/TableDeprecated/table";
import type { Table } from "@modules/_shared/InplaceVolumes/Table";
import { formatNumber } from "@modules/_shared/utils/numberFormatting";

const numFormat = (number: number, isPercentage = false): string => {
    return (
        Intl.NumberFormat("en", {
            notation: "compact",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
            style: "decimal",
        }).format(number) + (isPercentage ? "%" : "")
    );
};

export enum TableOriginKey {
    ENSEMBLE = "ENSEMBLE",
    TABLE_NAME = "TABLE_NAME",
    FLUID = "FLUID",
}

export enum InplaceSelectorKey {
    ZONE = "ZONE",
    REGION = "REGION",
    FACIES = "FACIES",
    LICENCE = "LICENCE",
}

const GROUPING_COLUMNS = [...Object.values(TableOriginKey), ...Object.values(InplaceSelectorKey)];

const STATS_COLUMNS = ["MIN", "P10", "MEAN", "P90", "MAX", "COUNT"];

function calculatePercentile(sortedValues: number[], percentile: number): number {
    const index = (percentile / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (lower === upper) {
        return sortedValues[lower];
    }

    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

function getGroupingColumns(table: Table): string[] {
    const tableColumns = table.getColumns().map((col) => col.getName());

    // Find which grouping columns exist in the table (excluding REAL and value columns)
    return GROUPING_COLUMNS.filter((col) => tableColumns.includes(col));
}

function getValueColumn(table: Table): string {
    const tableColumns = table.getColumns().map((col) => col.getName());

    // Find the value column (typically STOIIP, GIIP, etc.)
    // It's the column that's not a grouping column and not REAL
    const nonGroupingColumns = tableColumns.filter((col) => !GROUPING_COLUMNS.includes(col as any) && col !== "REAL");

    return nonGroupingColumns[0] || "STOIIP";
}

type EnsembleIdentToNameMap = Map<RegularEnsembleIdent | DeltaEnsembleIdent, string>;
export function useStatisticalTable(
    table: Table | null,
    ensembleSet: EnsembleSet,
    width: number,
    height: number,
    hoveredRegion: string | null,
    hoveredZone: string | null,
    hoveredFacies: string | null,
): { columns: TableColumns<TableRow<Record<string, any>>>; rows: TableRow<Record<string, any>>[] } {
    const ensembleIdentToNameMap: EnsembleIdentToNameMap = useMemo(
        () => new Map(ensembleSet.getEnsembleArray().map((ens) => [ens.getIdent(), ens.getDisplayName()])),
        [ensembleSet],
    );
    if (!table) {
        return { columns: [], rows: [] };
    }
    const columns = createColumns(table);
    const rows = createRows(table, ensembleIdentToNameMap);

    return { columns, rows };
}

export function createColumns(table: Table): TableColumns<TableRow<Record<string, any>>> {
    const groupingColumns = getGroupingColumns(table);
    const allColumns = [...groupingColumns, ...STATS_COLUMNS];

    return allColumns.map((name) => ({
        _type: "data",
        columnId: name,
        label: name,
        sizeInPercent: 100 / allColumns.length,
    }));
}

export function createRows(
    table: Table,
    ensembleIdentToNameMap: EnsembleIdentToNameMap,
): TableRow<Record<string, any>>[] {
    const groupingColumns = getGroupingColumns(table);
    const valueColumn = getValueColumn(table);

    // Group rows by the dynamic grouping columns
    const groups = new Map<string, { values: number[]; metadata: Record<string, any> }>();

    for (const row of table.getRows()) {
        // Create a key from the grouping columns
        const keyParts: string[] = [];
        const metadata: Record<string, any> = {};

        for (const col of groupingColumns) {
            let value = row[col];

            // Handle ENSEMBLE object
            if (col === "ENSEMBLE") {
                value = ensembleIdentToNameMap.get(value as any) || value;
            }

            keyParts.push(String(value));
            metadata[col] = value;
        }

        const key = keyParts.join("|");

        if (!groups.has(key)) {
            groups.set(key, { values: [], metadata });
        }

        groups.get(key)!.values.push(row[valueColumn] as number);
    }

    // Calculate statistics for each group
    const statisticalRows: TableRow<Record<string, any>>[] = [];

    for (const [key, group] of groups.entries()) {
        const { values, metadata } = group;

        // Sort values for percentile calculations
        const sorted = [...values].sort((a, b) => a - b);

        const min = sorted[0];
        const max = sorted[sorted.length - 1];
        const mean = sorted.reduce((sum, val) => sum + val, 0) / sorted.length;
        const p10 = calculatePercentile(sorted, 10);
        const p90 = calculatePercentile(sorted, 90);

        const row: Record<string, any> = {
            ...metadata,
            MIN: formatNumber(min),
            P10: formatNumber(p10),
            MEAN: formatNumber(mean),
            P90: formatNumber(p90),
            MAX: formatNumber(max),
            COUNT: values.length,
        };

        statisticalRows.push(row);
    }

    return statisticalRows;
}
