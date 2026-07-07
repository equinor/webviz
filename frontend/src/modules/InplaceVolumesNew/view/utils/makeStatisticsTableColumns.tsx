import { type StatisticsTableRowData } from "./TableBuilder";

export type TableColumn = {
    label: string;
    columnId: keyof StatisticsTableRowData;
    sizeInPercent: number;
};

/**
 * Creates the table columns for the statistics table with custom labels and color indicators.
 */
export function makeStatisticsTableColumns(subplotByLabel: string, colorByLabel: string): TableColumn[] {
    return [
        {
            columnId: "subplotValue",
            label: subplotByLabel,
            sizeInPercent: 15,
        },
        {
            columnId: "colorByValue",
            label: colorByLabel,
            sizeInPercent: 15,
        },
        {
            columnId: "mean",
            label: "Mean",
            sizeInPercent: 10,
        },
        {
            columnId: "p10",
            label: "P10",
            sizeInPercent: 10,
        },
        {
            columnId: "p90",
            label: "P90",
            sizeInPercent: 10,
        },
        {
            columnId: "p50",
            label: "P50",
            sizeInPercent: 10,
        },
        {
            columnId: "stdDev",
            label: "Std Dev",
            sizeInPercent: 10,
        },
        {
            columnId: "min",
            label: "Min",
            sizeInPercent: 10,
        },
        {
            columnId: "max",
            label: "Max",
            sizeInPercent: 10,
        },
    ];
}
