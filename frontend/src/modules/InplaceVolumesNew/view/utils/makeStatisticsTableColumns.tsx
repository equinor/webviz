import { type StatisticsTableRowData } from "./TableBuilder";

export type TableColumn = {
    label: string;
    columnId: keyof StatisticsTableRowData;
    sizeInPercent: number;
};

/**
 * Creates the table columns for the statistics table with custom labels and color indicators.
 */
export function makeStatisticsTableColumns(
    subplotByLabel: string,
    colorByLabel: string,
    barCategoryLabel: string | null,
): TableColumn[] {
    const identifierSizeInPercent = barCategoryLabel ? 12 : 15;
    const statisticSizeInPercent = barCategoryLabel ? 9 : 10;

    const identifierColumns: TableColumn[] = [
        { columnId: "subplotValue", label: subplotByLabel, sizeInPercent: identifierSizeInPercent },
        { columnId: "colorByValue", label: colorByLabel, sizeInPercent: identifierSizeInPercent },
    ];
    if (barCategoryLabel) {
        identifierColumns.push({ columnId: "barCategoryValue", label: barCategoryLabel, sizeInPercent: 13 });
    }

    const statisticColumns: Pick<TableColumn, "columnId" | "label">[] = [
        { columnId: "mean", label: "Mean" },
        { columnId: "p10", label: "P10" },
        { columnId: "p90", label: "P90" },
        { columnId: "p50", label: "P50" },
        { columnId: "stdDev", label: "Std Dev" },
        { columnId: "min", label: "Min" },
        { columnId: "max", label: "Max" },
    ];

    return [
        ...identifierColumns,
        ...statisticColumns.map((column) => ({ ...column, sizeInPercent: statisticSizeInPercent })),
    ];
}
