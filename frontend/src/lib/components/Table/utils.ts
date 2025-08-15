import { convertRemToPixels } from "@lib/utils/screenUnitConversions";
import { getTextWidthWithFont } from "@lib/utils/textSize";

import type {
    ColumnGroup,
    ColGroupDef,
    DataCellDef,
    FilterCellDef,
    HeaderCellDef,
    TableCellDefinitions,
    TableColumn,
    TableColumns,
    TableDataWithKey,
    LoadedDataWithKey,
} from "./types";

export function isColumnGroupDef<TData extends Record<string, any>>(
    headerOrGroup: TableColumn<TData>,
): headerOrGroup is ColumnGroup<TData> {
    return "subColumns" in headerOrGroup;
}

export function isLoadedDataRow<TData extends Record<string, any>>(
    data: TableDataWithKey<TData>,
): data is LoadedDataWithKey<TData> {
    if (data._pending) return false;
    return true;
}

function recursivelyCalcDepth<TData extends Record<string, any>>(
    tableColumns: TableColumns<TData>,
    depth: number = 1,
): number {
    let maxDepth = depth;
    for (const columnDef of tableColumns) {
        if (isColumnGroupDef(columnDef) && columnDef.subColumns) {
            const localDepth = recursivelyCalcDepth(columnDef.subColumns, depth + 1);
            maxDepth = Math.max(maxDepth, localDepth);
        }
    }
    return maxDepth;
}

export function defaultDataFilterPredicate<TData extends Record<string, any | null>, TKey extends keyof TData>(
    filterValue: string,
    columnData: TData[TKey],
    dataDefinition: DataCellDef<TData, TKey>,
    entry: TData,
) {
    const formattedData = dataDefinition.format?.(columnData, entry) ?? columnData ?? "";

    const lowerValue = String(formattedData).toLowerCase();
    const filterString = filterValue.toLowerCase();

    return lowerValue.includes(filterString);
}

export function recursivelyBuildTableCellDefinitions<TData extends Record<string, any>>(
    tableColumns: TableColumns<TData>,
) {
    const maxDepth = recursivelyCalcDepth(tableColumns);

    return doRecursivelyBuildTableCellDefinitions(tableColumns, 0, maxDepth, []);
}
function doRecursivelyBuildTableCellDefinitions<TData extends Record<string, any>>(
    tableColumns: TableColumns<TData>,
    depth: number,
    maxDepth: number,
    // ! Object is mutated as the method runs
    headerCells: HeaderCellDef[][],
): TableCellDefinitions<TData> {
    const dataCells: DataCellDef<TData, any>[] = [];
    const filterCells: FilterCellDef<TData>[] = [];

    if (!headerCells[depth]) {
        headerCells[depth] = [];
    }

    for (const tableColumn of tableColumns) {
        if (isColumnGroupDef(tableColumn)) {
            const nestedDef = doRecursivelyBuildTableCellDefinitions(
                tableColumn.subColumns,
                depth + 1,
                maxDepth,
                headerCells,
            );

            dataCells.push(...nestedDef.dataCells);
            filterCells.push(...nestedDef.filterCells);

            headerCells[depth].push({
                columnId: tableColumn.columnId,
                isGroup: true,
                sortable: false,
                rowSpan: 1,
                colSpan: nestedDef.dataCells.length,
                colGroupIndex: headerCells[0].length,
                label: tableColumn.label,
                hoverText: tableColumn.hoverText,
            });
        } else {
            const filterDef = tableColumn.filter;

            const filterEnabled = filterDef === undefined || !!tableColumn.filter;

            const customImpl = typeof filterDef === "object";
            const filterRender = customImpl ? filterDef.render : undefined;
            const filterPredicate = customImpl ? filterDef.predicate : undefined;

            headerCells[depth].push({
                columnId: tableColumn.columnId,
                colSpan: 1,
                rowSpan: maxDepth - depth,
                colGroupIndex: headerCells[0].length,
                sortable: tableColumn.sortable == null || tableColumn.sortable,
                isGroup: false,
                label: tableColumn.label,
                hoverText: tableColumn.hoverText,
            });

            dataCells.push({
                columnId: tableColumn.columnId,
                colGroupIndex: headerCells[0].length,
                format: tableColumn.formatValue,
                filter: filterPredicate,
                style: tableColumn.formatStyle,
                render: tableColumn.renderData,
            });

            filterCells.push({
                columnId: tableColumn.columnId,
                colGroupIndex: headerCells[0].length,
                enabled: filterEnabled,
                render: filterRender,
            });
        }
    }

    return { dataCells, filterCells, headerCells };
}

export function recursivelyBuildTableColumnGroups<TData extends Record<string, any>>(
    tableColumns: TableColumns<TData>,
    parentSize: number = 100,
): ColGroupDef[] {
    const colGroups = [];

    for (const tableColumn of tableColumns) {
        const columnId = tableColumn.columnId;
        const columnSize = (tableColumn.sizeInPercent * parentSize) / 100;

        if (isColumnGroupDef(tableColumn)) {
            const childColGroups = recursivelyBuildTableColumnGroups(tableColumn.subColumns, columnSize);

            // ! The HTML spec doesn't allow nested column-groups, so further col-groups are flattened
            const flattenedCols = childColGroups.flatMap((colGroup) =>
                colGroup.cols.map((col) => ({
                    ...col,
                    columnId: `${columnId}__${col.columnId}`,
                })),
            );

            colGroups.push({
                cols: flattenedCols,
                columnId,
            });
        } else {
            // The the table can support dynamic data, so we cannot pre-compute column widths based on data content.
            // To ensure the table looks somewhat nice, we compute a minimum width that should at least fit the header title and adornments

            let minWidth = getTextWidthWithFont(tableColumn.label, "Equinor", 1);
            // Padding
            minWidth += convertRemToPixels(2);

            if (tableColumn.sortable == null || tableColumn.sortable) {
                // Adornment and gap
                minWidth += convertRemToPixels(4);
            }

            colGroups.push({
                cols: [{ columnId, minWidth, width: columnSize }],
                columnId,
            });
        }
    }

    return colGroups;
}

// The table need to at least be wide enough that each column can fit it's headers
export function computeTableMinWidth(colGroups: ColGroupDef[]) {
    let minWidth = 0;

    for (const colGroup of colGroups) {
        for (const col of colGroup.cols) {
            minWidth += col.minWidth;
        }
    }

    return minWidth;
}
