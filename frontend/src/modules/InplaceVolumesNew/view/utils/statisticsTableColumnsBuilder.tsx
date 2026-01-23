import type { TableColumns } from "@lib/components/Table/types";

import { STATISTICS_TABLE_COLUMNS, type StatisticsTableRowData } from "./TableBuilder";

/**
 * Creates the table columns for the statistics table with custom labels and color indicators.
 */
export function makeStatisticsTableColumns(
    subplotByLabel: string,
    colorByLabel: string,
    colorMap: Map<string, string>,
): TableColumns<StatisticsTableRowData> {
    return STATISTICS_TABLE_COLUMNS.map(
        (col: TableColumns<StatisticsTableRowData>[number]): TableColumns<StatisticsTableRowData>[number] => {
            if (col._type === "data" && col.columnId === "subplotValue") {
                return {
                    ...col,
                    label: subplotByLabel,
                };
            }
            if (col._type === "data" && col.columnId === "colorByValue") {
                return {
                    ...col,
                    label: colorByLabel,
                    renderData: (value: string, context: { entry: StatisticsTableRowData }) => {
                        const rowColor = colorMap.get(context.entry.colorByKey);
                        return (
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: rowColor }}
                                />
                                <span>{value}</span>
                            </div>
                        );
                    },
                };
            }
            return col;
        },
    );
}
