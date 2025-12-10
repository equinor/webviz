import type { EnsembleSet } from "@framework/EnsembleSet";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { TableColumns } from "@lib/components/Table/types";
import type { ColorSet } from "@lib/utils/ColorSet";
import type { Table } from "@modules/_shared/InplaceVolumes/Table";
import { TableOriginKey } from "@modules/_shared/InplaceVolumes/types";
import { computeReservesP10, computeReservesP50, computeReservesP90 } from "@modules/_shared/utils/math/statistics";
import { formatNumber } from "@modules/_shared/utils/numberFormatting";

export type StatisticsTableRowData = {
    id: string;
    subplotValue: string;
    colorByValue: string;
    colorByKey: string;
    mean: string;
    stdDev: string;
    min: string;
    max: string;
    p10: string;
    p50: string;
    p90: string;
};

export const STATISTICS_TABLE_COLUMNS: TableColumns<StatisticsTableRowData> = [
    {
        _type: "data",
        columnId: "subplotValue",
        label: "Subplot",
        sizeInPercent: 15,
    },
    {
        _type: "data",
        columnId: "colorByValue",
        label: "Color",
        sizeInPercent: 15,
    },
    {
        _type: "data",
        columnId: "mean",
        label: "Mean",
        sizeInPercent: 10,
    },
    {
        _type: "data",
        columnId: "p10",
        label: "P10",
        sizeInPercent: 10,
    },
    {
        _type: "data",
        columnId: "p90",
        label: "P90",
        sizeInPercent: 10,
    },
    {
        _type: "data",
        columnId: "p50",
        label: "P50",
        sizeInPercent: 10,
    },
    {
        _type: "data",
        columnId: "stdDev",
        label: "Std Dev",
        sizeInPercent: 10,
    },
    {
        _type: "data",
        columnId: "min",
        label: "Min",
        sizeInPercent: 10,
    },
    {
        _type: "data",
        columnId: "max",
        label: "Max",
        sizeInPercent: 10,
    },
];

function computeStatistics(values: number[]): {
    count: number;
    mean: number;
    stdDev: number;
    min: number;
    max: number;
    p10: number;
    p50: number;
    p90: number;
} {
    if (values.length === 0) {
        return { count: 0, mean: 0, stdDev: 0, min: 0, max: 0, p10: 0, p50: 0, p90: 0 };
    }

    const count = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / count;
    // Use sample standard deviation (ddof=1) like Polars
    const variance = count > 1 ? values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (count - 1) : 0;
    const stdDev = Math.sqrt(variance);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const p10 = computeReservesP10(values);
    const p50 = computeReservesP50(values);
    const p90 = computeReservesP90(values);

    return { count, mean, stdDev, min, max, p10, p50, p90 };
}

function formatLabel(columnName: string, value: string | number, ensembleSet: EnsembleSet): string {
    if (columnName === TableOriginKey.ENSEMBLE) {
        const ensembleIdent = RegularEnsembleIdent.fromString(value.toString());
        const ensemble = ensembleSet.findEnsemble(ensembleIdent);
        if (ensemble) {
            return ensemble.getDisplayName();
        }
    }
    return value.toString();
}

export interface BuildStatisticsTableDataOptions {
    table: Table;
    resultName: string;
    subplotBy: string;
    colorBy: string;
    ensembleSet: EnsembleSet;
    colorSet: ColorSet;
}

export interface StatisticsTableData {
    rows: StatisticsTableRowData[];
    colorMap: Map<string, string>;
    subplotByLabel: string;
    colorByLabel: string;
}

export function buildStatisticsTableData({
    table,
    resultName,
    subplotBy,
    colorBy,
    ensembleSet,
    colorSet,
}: BuildStatisticsTableDataOptions): StatisticsTableData {
    const rows = buildTableRows({ table, resultName, subplotBy, colorBy, ensembleSet });
    const colorMap = buildColorMap(table, colorBy, ensembleSet, colorSet);
    return { rows, colorMap, subplotByLabel: subplotBy, colorByLabel: colorBy };
}

function buildTableRows({
    table,
    resultName,
    subplotBy,
    colorBy,
    ensembleSet,
}: Omit<BuildStatisticsTableDataOptions, "colorSet">): StatisticsTableRowData[] {
    const rows: StatisticsTableRowData[] = [];

    // Handle case where subplotBy and colorBy are the same
    if (subplotBy === colorBy) {
        const collection = table.splitByColumn(subplotBy, true);

        for (const [key, splitTable] of collection.getCollectionMap()) {
            const resultColumn = splitTable.getColumn(resultName);
            if (!resultColumn) {
                continue;
            }

            const values = resultColumn.getAllRowValues() as number[];
            const stats = computeStatistics(values);

            const label = formatLabel(subplotBy, key, ensembleSet);

            rows.push({
                id: `${key}-${key}`,
                subplotValue: label,
                colorByValue: label,
                colorByKey: key.toString(),
                mean: formatNumber(stats.mean, 2),
                stdDev: formatNumber(stats.stdDev, 2),
                min: formatNumber(stats.min, 2),
                max: formatNumber(stats.max, 2),
                p10: formatNumber(stats.p10, 2),
                p50: formatNumber(stats.p50, 2),
                p90: formatNumber(stats.p90, 2),
            });
        }

        return rows;
    }

    const subplotCollection = table.splitByColumn(subplotBy, true);

    for (const [subplotKey, subplotTable] of subplotCollection.getCollectionMap()) {
        const colorByCollection = subplotTable.splitByColumn(colorBy, true);

        for (const [colorByKey, colorByTable] of colorByCollection.getCollectionMap()) {
            const resultColumn = colorByTable.getColumn(resultName);
            if (!resultColumn) {
                continue;
            }

            const values = resultColumn.getAllRowValues() as number[];
            const stats = computeStatistics(values);

            const subplotLabel = formatLabel(subplotBy, subplotKey, ensembleSet);
            const colorByLabel = formatLabel(colorBy, colorByKey, ensembleSet);

            rows.push({
                id: `${subplotKey}-${colorByKey}`,
                subplotValue: subplotLabel,
                colorByValue: colorByLabel,
                colorByKey: colorByKey.toString(),
                mean: formatNumber(stats.mean, 2),
                stdDev: formatNumber(stats.stdDev, 2),
                min: formatNumber(stats.min, 2),
                max: formatNumber(stats.max, 2),
                p10: formatNumber(stats.p10, 2),
                p50: formatNumber(stats.p50, 2),
                p90: formatNumber(stats.p90, 2),
            });
        }
    }

    return rows;
}

function buildColorMap(
    table: Table,
    colorBy: string,
    ensembleSet: EnsembleSet,
    colorSet: ColorSet,
): Map<string, string> {
    const colorMap = new Map<string, string>();
    const colorByColumn = table.getColumn(colorBy);

    if (!colorByColumn) {
        return colorMap;
    }

    const uniqueValues = colorByColumn.getUniqueValues();
    let color = colorSet.getFirstColor();

    for (const value of uniqueValues) {
        const key = value.toString();

        if (colorBy === TableOriginKey.ENSEMBLE) {
            const ensembleIdent = RegularEnsembleIdent.fromString(key);
            const ensemble = ensembleSet.findEnsemble(ensembleIdent);
            if (ensemble) {
                colorMap.set(key, ensemble.getColor());
                continue;
            }
        }

        colorMap.set(key, color);
        color = colorSet.getNextColor();
    }

    return colorMap;
}
