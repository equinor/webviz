import { useMemo, useRef, useEffect } from "react";

import { useAtomValue } from "jotai";

import type { EnsembleSet } from "@framework/EnsembleSet";
import type { ViewContext } from "@framework/ModuleContext";
import type { TableColumns } from "@lib/components/Table/types";
import { computeReservesP10, computeReservesP90 } from "@modules/_shared/utils/math/statistics";
import { formatNumber } from "@modules/_shared/utils/numberFormatting";
import type { Interfaces } from "@modules/InplaceVolumesNew/interfaces";
import { PlotType } from "@modules/InplaceVolumesNew/typesAndEnums";

import { colorByAtom, firstResultNameAtom, subplotByAtom } from "../atoms/baseAtoms";
import type { GroupedTableEntry, InplaceVolumesTable } from "../utils/inplaceVolumesTable";

import { useInplaceVolumesTable } from "./useInplaceVolumesTable";

type StatisticalRowData = {
    [key: string]: string | number;
};

type Statistics = {
    mean: number;
    min: number;
    max: number;
    p10: number;
    p90: number;
    stddev: number;
};
export type StatisticalTableContent = {
    columns: TableColumns<StatisticalRowData>;
    rows: StatisticalRowData[];
};
/**
 * Hook to build statistical table data
 */

export function useBuildStatisticalTable(
    viewContext: ViewContext<Interfaces>,
    ensembleSet: EnsembleSet,
): {
    columns: TableColumns<StatisticalRowData>;
    rows: StatisticalRowData[];
} {
    const inplaceVolumesTable = useInplaceVolumesTable();
    const firstResultName = useAtomValue(firstResultNameAtom);
    const subplotBy = useAtomValue(subplotByAtom);
    const colorBy = useAtomValue(colorByAtom);
    const plotOptions = viewContext.useSettingsToViewInterfaceValue("plotOptions");
    const plotType = viewContext.useSettingsToViewInterfaceValue("plotType");

    const ensembleIdentStringToNameMap = useMemo(
        () => new Map(ensembleSet.getEnsembleArray().map((ens) => [ens.getIdent().toString(), ens.getDisplayName()])),
        [ensembleSet],
    );

    // Cache for computed statistics - keyed by group key
    const statsCache = useRef<Map<string, Statistics>>(new Map());

    // Clear cache when dependencies change
    useEffect(() => {
        statsCache.current.clear();
    }, [inplaceVolumesTable, firstResultName, subplotBy, colorBy]);

    const { columns, rows } = useMemo<{
        columns: TableColumns<StatisticalRowData>;
        rows: StatisticalRowData[];
    }>(() => {
        if (plotType !== PlotType.STATISTICAL_TABLE || !inplaceVolumesTable || !firstResultName) {
            return { columns: [], rows: [] };
        }

        // Check if result column exists
        if (!inplaceVolumesTable.hasColumn(firstResultName)) {
            return { columns: [], rows: [] };
        }

        // Determine grouping columns (subplot + color)
        const groupingColumns = Array.from(new Set([...subplotBy, colorBy]));
        if (groupingColumns.length === 0) {
            return { columns: [], rows: [] };
        }

        // Build columns configuration
        const tableColumns = buildTableColumns(groupingColumns);

        // Group the data
        const groupedEntries = inplaceVolumesTable.splitByColumns(groupingColumns);

        // Build rows with statistics calculation
        const rowsData = buildStatisticalRows(
            groupedEntries,
            groupingColumns,
            firstResultName,
            statsCache.current,
            ensembleIdentStringToNameMap,
            plotOptions.hideConstants,
        );

        return { columns: tableColumns, rows: rowsData };
    }, [
        inplaceVolumesTable,
        firstResultName,
        subplotBy,
        colorBy,
        plotOptions.hideConstants,
        plotType,
        ensembleIdentStringToNameMap,
    ]);

    return { columns, rows };
}

function buildTableColumns(groupingColumns: string[]): TableColumns<StatisticalRowData> {
    const columns: TableColumns<StatisticalRowData> = [];

    // Add grouping columns
    const groupingColumnWidth = Math.floor(40 / groupingColumns.length);
    for (const colName of groupingColumns) {
        columns.push({
            _type: "data",
            columnId: colName,
            label: colName,
            sizeInPercent: groupingColumnWidth,
        });
    }

    // Add statistical columns
    const statColumns = [
        { id: "mean", label: "Mean" },
        { id: "stddev", label: "Std Dev" },
        { id: "max", label: "Max" },
        { id: "min", label: "Min" },
        { id: "p10", label: "P10" },
        { id: "p90", label: "P90" },
    ];

    const statColumnWidth = Math.floor(60 / statColumns.length);
    for (const stat of statColumns) {
        columns.push({
            _type: "data",
            columnId: stat.id,
            label: stat.label,
            sizeInPercent: statColumnWidth,
            formatValue: (value: number | string) => {
                if (typeof value === "number") {
                    return formatNumber(value, 2);
                }
                return String(value);
            },
        });
    }

    return columns;
}

function buildStatisticalRows(
    groupedEntries: GroupedTableEntry[],
    groupingColumns: string[],
    resultName: string,
    statsCache: Map<string, Statistics>,
    ensembleNameMap: Map<string, string>,
    hideConstants: boolean,
): StatisticalRowData[] {
    const rows: StatisticalRowData[] = [];

    for (const entry of groupedEntries) {
        const row: StatisticalRowData = {};

        for (let i = 0; i < groupingColumns.length; i++) {
            const columnName = groupingColumns[i];
            let value = entry.keyParts[i]?.toString() ?? entry.key;

            // If ensemble column, map ident to display name
            if (columnName === "ENSEMBLE" && ensembleNameMap.has(value)) {
                value = ensembleNameMap.get(value)!;
            }

            row[columnName] = value;
        }

        // Get or compute statistics
        let stats = statsCache.get(entry.key) ?? null;
        if (!stats) {
            stats = calculateStatisticsForGroup(entry.table, resultName);
            if (stats) {
                statsCache.set(entry.key, stats);
            }
        }

        if (!stats) {
            continue;
        }

        // Filter out constants if option enabled
        if (hideConstants && stats.stddev <= 1e-10) {
            continue;
        }

        // Add statistics to row
        row.mean = stats.mean;
        row.min = stats.min;
        row.max = stats.max;
        row.p10 = stats.p10;
        row.p90 = stats.p90;
        row.stddev = stats.stddev;

        rows.push(row);
    }

    return rows;
}

function calculateStatisticsForGroup(groupTable: InplaceVolumesTable, resultName: string): Statistics | null {
    const values = groupTable.getColumn(resultName);
    if (!values || values.length === 0) {
        return null;
    }

    // Filter to numeric values only
    const numericValues = values.filter((v: any): v is number => typeof v === "number" && !isNaN(v));
    if (numericValues.length === 0) {
        return null;
    }
    const n = numericValues.length;
    if (n === 0) {
        // Handle empty array case
        return { mean: NaN, min: Infinity, max: -Infinity, p10: NaN, p90: NaN, stddev: NaN };
    }

    const sorted = [...numericValues].sort((a, b) => a - b);

    // Mean
    const mean = sorted.reduce((sum, val) => sum + val, 0) / n;

    // Min and Max
    const min = sorted[0];
    const max = sorted[n - 1];

    // Percentiles
    const p10 = computeReservesP10(sorted);
    const p90 = computeReservesP90(sorted);

    // Standard deviation (sample)
    const variance = sorted.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1);
    const stddev = Math.sqrt(variance);

    return {
        mean,
        min,
        max,
        p10,
        p90,
        stddev,
    };
}
