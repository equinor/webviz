import type { TableColumns } from "@lib/components/Table/types";
import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import type { GroupedTableData } from "./GroupedTableData";
import { computeStatistics } from "./statistics";

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

export interface StatisticsTableData {
    rows: StatisticsTableRowData[];
    colorMap: Map<string, string>;
    subplotByLabel: string;
    colorByLabel: string;
}

/**
 * Builds statistics table data from pre-grouped table data.
 * Uses the same grouping as the plot builder for consistency.
 */
export function buildStatisticsTableData(groupedData: GroupedTableData, resultName: string): StatisticsTableData {
    const rows: StatisticsTableRowData[] = [];

    for (const entry of groupedData.getAllEntries()) {
        const resultColumn = entry.table.getColumn(resultName);
        if (!resultColumn) {
            continue;
        }

        const values = resultColumn.getAllRowValues() as number[];
        const stats = computeStatistics(values);

        rows.push({
            id: `${entry.subplotKey}-${entry.colorKey}`,
            subplotValue: entry.subplotLabel,
            colorByValue: entry.colorLabel,
            colorByKey: entry.colorKey,
            mean: formatNumber(stats.mean, 2),
            stdDev: formatNumber(stats.stdDev, 2),
            min: formatNumber(stats.min, 2),
            max: formatNumber(stats.max, 2),
            p10: formatNumber(stats.p10, 2),
            p50: formatNumber(stats.p50, 2),
            p90: formatNumber(stats.p90, 2),
        });
    }

    return {
        rows,
        colorMap: groupedData.getColorMap(),
        subplotByLabel: groupedData.getSubplotBy(),
        colorByLabel: groupedData.getColorBy(),
    };
}
