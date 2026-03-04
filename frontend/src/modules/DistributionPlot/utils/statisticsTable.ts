import type { ChannelReceiverReturnData, KeyKind } from "@framework/types/dataChannnel";
import type { TableColumns } from "@lib/components/Table/types";
import { computeP50, computeReservesP10, computeReservesP90 } from "@modules/_shared/utils/math/statistics";
import { formatNumber } from "@modules/_shared/utils/numberFormatting";

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
 */
export function makeStatisticsTableColumns(): TableColumns<StatisticsTableRowData> {
    return [
        {
            _type: "data",
            columnId: "channelContent",
            label: "Channel",
            sizeInPercent: 19,
        },
        {
            _type: "data",
            columnId: "mean",
            label: "Mean",
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
            columnId: "p10",
            label: "P10",
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
            columnId: "p90",
            label: "P90",
            sizeInPercent: 10,
        },
        {
            _type: "data",
            columnId: "max",
            label: "Max",
            sizeInPercent: 10,
        },
        {
            _type: "data",
            columnId: "count",
            label: "Count",
            sizeInPercent: 7,
        },
    ];
}
