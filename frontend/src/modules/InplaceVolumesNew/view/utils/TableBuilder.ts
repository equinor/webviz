import { formatInplaceVolumesValue } from "@modules/_shared/InplaceVolumes/numberFormat";
import type { Table } from "@modules/_shared/InplaceVolumes/Table";
import { computeStatistics } from "@modules/_shared/utils/math/statistics";

import { orderEntriesByPreferredValues, type GroupedTableData } from "./GroupedTableData";

export type StatisticsTableRowData = {
    id: string;
    subplotValue: string;
    colorByValue: string;
    colorByKey: string;
    barCategoryValue: string;
    mean: string;
    stdDev: string;
    min: string;
    max: string;
    p10: string;
    p50: string;
    p90: string;
};

export interface StatisticsTableData {
    rows: StatisticsTableRowData[];
    colorMap: Map<string, string>;
    subplotByLabel: string;
    colorByLabel: string;
    barCategoryLabel: string | null;
}

export type StatisticsBarCategory = {
    column: string;
    order?: readonly string[];
};

/**
 * Builds statistics table data from pre-grouped table data.
 * Uses the same grouping as the plot builder for consistency. With a `barCategory`, each group is
 * further split per category value, matching bar plots that show one bar per category.
 */
export function buildStatisticsTableData(
    groupedData: GroupedTableData,
    resultName: string,
    barCategory: StatisticsBarCategory | null = null,
): StatisticsTableData {
    const rows: StatisticsTableRowData[] = [];
    const formatLabel = groupedData.getFormatLabelFunction();

    for (const entry of groupedData.getAllEntries()) {
        const categoryTables: [string | number | null, Table][] = barCategory
            ? orderEntriesByPreferredValues(
                  Array.from(entry.table.splitByColumn(barCategory.column, true).getCollectionMap()),
                  barCategory.order,
              )
            : [[null, entry.table]];

        for (const [categoryKey, categoryTable] of categoryTables) {
            const resultColumn = categoryTable.getColumn(resultName);
            if (!resultColumn) {
                continue;
            }

            const values = resultColumn.getAllRowValues() as number[];
            const stats = computeStatistics(values);

            rows.push({
                id: `${entry.subplotKey}-${entry.colorKey}-${categoryKey ?? ""}`,
                subplotValue: entry.subplotLabel,
                colorByValue: entry.colorLabel,
                colorByKey: entry.colorKey,
                barCategoryValue:
                    barCategory && categoryKey !== null ? formatLabel(barCategory.column, categoryKey) : "",
                mean: formatInplaceVolumesValue(stats.mean),
                stdDev: formatInplaceVolumesValue(stats.stdDev),
                min: formatInplaceVolumesValue(stats.min),
                max: formatInplaceVolumesValue(stats.max),
                p10: formatInplaceVolumesValue(stats.p10),
                p50: formatInplaceVolumesValue(stats.p50),
                p90: formatInplaceVolumesValue(stats.p90),
            });
        }
    }

    return {
        rows,
        colorMap: groupedData.getColorMap(),
        subplotByLabel: groupedData.getSubplotBy(),
        colorByLabel: groupedData.getColorBy(),
        barCategoryLabel: barCategory?.column ?? null,
    };
}
