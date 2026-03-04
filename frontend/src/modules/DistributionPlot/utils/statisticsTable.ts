import type { ChannelReceiverReturnData, KeyKind } from "@framework/types/dataChannnel";
import type { TableColumns } from "@lib/components/Table/types";
import { computeP50, computeReservesP10, computeReservesP90 } from "@modules/_shared/utils/math/statistics";
import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import { type StatisticsColumn, STATISTICS_COLUMN_LABELS } from "../typesAndEnums";

import { makeTitleFromChannelContent } from "./stringUtils";

export type StatisticsTableRowData = {
    id: string;
    channelContent: string;
    mean: string;
    stdDev: string;
    min: string;
    max: string;
    p10: string;
    p50: string;
    p90: string;
    count: string;
};

export interface StatisticsTableData {
    rows: StatisticsTableRowData[];
}

/**
 * Builds statistics table data from one or more channel contents.
 * Computes statistics (mean, stdDev, min, max, p10, p50, p90) for each content entry.
 */
export function buildStatisticsTableData(
    ...channels: (ChannelReceiverReturnData<KeyKind.REALIZATION[]>["channel"] & {})[]
): StatisticsTableData {
    const rows: StatisticsTableRowData[] = [];

    channels.forEach((channel) => {
        channel.contents.forEach((content, index) => {
            const values = content.dataArray.map((el) => el.value as number);

            if (values.length === 0) {
                return;
            }

            const count = values.length;
            const mean = values.reduce((a, b) => a + b, 0) / count;
            const variance =
                count > 1 ? values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (count - 1) : 0;
            const stdDev = Math.sqrt(variance);
            const min = values.reduce((acc, val) => Math.min(acc, val), Infinity);
            const max = values.reduce((acc, val) => Math.max(acc, val), -Infinity);
            const p10 = computeReservesP10(values);
            const p50 = computeP50(values);
            const p90 = computeReservesP90(values);

            rows.push({
                id: `${index}-${makeTitleFromChannelContent(content)}`,
                channelContent: makeTitleFromChannelContent(content),
                mean: formatNumber(mean, 2),
                stdDev: formatNumber(stdDev, 2),
                min: formatNumber(min, 2),
                max: formatNumber(max, 2),
                p10: formatNumber(p10, 2),
                p50: formatNumber(p50, 2),
                p90: formatNumber(p90, 2),
                count: count.toString(),
            });
        });
    });

    return { rows };
}

/**
 * Creates the table column definitions for the statistics table.
 * Only includes columns present in selectedColumns, and distributes widths so they sum to 100%.
 */
export function makeStatisticsTableColumns(selectedColumns: StatisticsColumn[]): TableColumns<StatisticsTableRowData> {
    const statColumnDefs: { columnId: keyof StatisticsTableRowData; statisticsColumn: StatisticsColumn }[] = [
        { columnId: "mean", statisticsColumn: "mean" as StatisticsColumn },
        { columnId: "stdDev", statisticsColumn: "stdDev" as StatisticsColumn },
        { columnId: "min", statisticsColumn: "min" as StatisticsColumn },
        { columnId: "max", statisticsColumn: "max" as StatisticsColumn },
        { columnId: "p10", statisticsColumn: "p10" as StatisticsColumn },
        { columnId: "p50", statisticsColumn: "p50" as StatisticsColumn },
        { columnId: "p90", statisticsColumn: "p90" as StatisticsColumn },
        { columnId: "count", statisticsColumn: "count" as StatisticsColumn },
    ];

    const visibleStats = statColumnDefs.filter((def) => selectedColumns.includes(def.statisticsColumn));
    const channelColumnPercent = 20;
    const remainingPercent = 100 - channelColumnPercent;
    const perStatPercent =
        visibleStats.length > 0 ? Math.floor((remainingPercent / visibleStats.length) * 100) / 100 : 0;

    const columns: TableColumns<StatisticsTableRowData> = [
        {
            _type: "data",
            columnId: "channelContent",
            label: "Channel",
            sizeInPercent: channelColumnPercent,
        },
    ];

    for (let i = 0; i < visibleStats.length; i++) {
        const def = visibleStats[i];
        const isLast = i === visibleStats.length - 1;
        const width = isLast ? remainingPercent - perStatPercent * (visibleStats.length - 1) : perStatPercent;
        columns.push({
            _type: "data",
            columnId: def.columnId,
            label: STATISTICS_COLUMN_LABELS[def.statisticsColumn],
            sizeInPercent: width,
        });
    }

    return columns;
}
