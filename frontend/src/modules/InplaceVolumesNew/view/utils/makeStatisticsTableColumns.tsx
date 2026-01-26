import type { TableColumns } from "@lib/components/Table/types";

import { type StatisticsTableRowData } from "./TableBuilder";

/**
 * Creates the table columns for the statistics table with custom labels and color indicators.
 */
export function makeStatisticsTableColumns(
    subplotByLabel: string,
    colorByLabel: string,
    colorMap: Map<string, string>,
): TableColumns<StatisticsTableRowData> {
    return [
        {
            _type: "data",
            columnId: "subplotValue",
            label: subplotByLabel,
            sizeInPercent: 15,
        },
        {
            _type: "data",
            columnId: "colorByValue",
            label: colorByLabel,
            sizeInPercent: 15,
            renderData: (value: string, context: { entry: StatisticsTableRowData }) => {
                const rowColor = colorMap.get(context.entry.colorByKey);
                return (
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: rowColor }} />
                        <span>{value}</span>
                    </div>
                );
            },
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
}
