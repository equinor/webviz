import { formatInplaceVolumesValue } from "@modules/_shared/InplaceVolumes/numberFormat";
import { computeStatistics } from "@modules/_shared/utils/math/statistics";

import type { GroupedTableData } from "./GroupedTableData";

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
            mean: formatInplaceVolumesValue(stats.mean),
            stdDev: formatInplaceVolumesValue(stats.stdDev),
            min: formatInplaceVolumesValue(stats.min),
            max: formatInplaceVolumesValue(stats.max),
            p10: formatInplaceVolumesValue(stats.p10),
            p50: formatInplaceVolumesValue(stats.p50),
            p90: formatInplaceVolumesValue(stats.p90),
        });
    }

    return {
        rows,
        colorMap: groupedData.getColorMap(),
        subplotByLabel: groupedData.getSubplotBy(),
        colorByLabel: groupedData.getColorBy(),
    };
}
