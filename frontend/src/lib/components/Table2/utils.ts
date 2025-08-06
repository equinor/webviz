import React from "react";

import { convertRemToPixels } from "@lib/utils/screenUnitConversions";
import { getTextWidthWithFont } from "@lib/utils/textSize";

import type {
    ColumnGroup,
    ColumnDefMap,
    ColumnDef,
    ColGroupDef,
    DataCellDef,
    FilterCellDef,
    HeaderCellDef,
    TableCellDefinitions,
    TableRowData,
} from "./types";

export function isColumnGroupDef(headerOrGroup: ColumnDef | ColumnGroup): headerOrGroup is ColumnGroup {
    return "subColumns" in headerOrGroup;
}

function recursivelyCalcDepth(columnDefinitions: ColumnDefMap, depth: number = 1): number {
    let maxDepth = depth;
    for (const col in columnDefinitions) {
        const columnDef = columnDefinitions[col];

        if (isColumnGroupDef(columnDef) && columnDef.subColumns) {
            const localDepth = recursivelyCalcDepth(columnDef.subColumns, depth + 1);
            maxDepth = Math.max(maxDepth, localDepth);
        }
    }
    return maxDepth;
}

export function defaultDataFilterPredicate(
    columnData: string | number | null,
    filterValue: string,
    dataDefinition: DataCellDef,
    entry: TableRowData<any>,
) {
    const formattedData = dataDefinition.format?.(columnData, entry) ?? columnData ?? "";

    const lowerValue = formattedData.toString().toLowerCase();
    const filterString = filterValue.toLowerCase();

    return !lowerValue.includes(filterString);
}

export function recursivelyBuildTableCellDefinitions(
    columnDefinitions: ColumnDefMap,
    depth: number = 0,
    maxDepth = recursivelyCalcDepth(columnDefinitions),
    // ! Object is mutated as the method runs
    headerCells: HeaderCellDef[][] = [],
): TableCellDefinitions {
    const dataCells: DataCellDef[] = [];
    const filterCells: FilterCellDef[] = [];

    if (!headerCells[depth]) {
        headerCells[depth] = [];
    }

    for (const columnId in columnDefinitions) {
        const columnDefOrGroup = columnDefinitions[columnId];

        if (isColumnGroupDef(columnDefOrGroup)) {
            const nestedDef = recursivelyBuildTableCellDefinitions(
                columnDefOrGroup.subColumns,
                depth + 1,
                maxDepth,
                headerCells,
            );

            dataCells.push(...nestedDef.dataCells);
            filterCells.push(...nestedDef.filterCells);

            headerCells[depth].push({
                columnId: columnId,
                isGroup: true,
                sortable: false,
                rowSpan: 1,
                colSpan: nestedDef.dataCells.length,
                colGroupIndex: headerCells[0].length,
                label: columnDefOrGroup.label,
                hoverText: columnDefOrGroup.hoverText,
            });
        } else {
            const filterDef = columnDefOrGroup.filter;

            const filterEnabled = filterDef === undefined || !!columnDefOrGroup.filter;

            const customImpl = typeof filterDef === "object";
            const filterRender = customImpl ? filterDef.render : undefined;
            const filterPredicate = customImpl ? filterDef.predicate : undefined;

            headerCells[depth].push({
                columnId: columnId,
                colSpan: 1,
                rowSpan: maxDepth - depth,
                colGroupIndex: headerCells[0].length,
                sortable: columnDefOrGroup.sortable == null || columnDefOrGroup.sortable,
                isGroup: false,
                label: columnDefOrGroup.label,
                hoverText: columnDefOrGroup.hoverText,
            });

            dataCells.push({
                columnId: columnId,
                colGroupIndex: headerCells[0].length,
                format: columnDefOrGroup.formatValue,
                filter: filterPredicate,
                style: columnDefOrGroup.formatStyle,
                render: columnDefOrGroup.renderData,
                // TODO: Allow render func
                // render: columnDefOrGroup.render,
            });

            filterCells.push({
                columnId: columnId,
                colGroupIndex: headerCells[0].length,
                enabled: filterEnabled,
                render: filterRender,
            });
        }
    }

    return { dataCells, filterCells, headerCells };
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

export function recursivelyBuildTableColumnGroups(
    columnDefinitions: ColumnDefMap,
    parentSize: number = 100,
): ColGroupDef[] {
    const colGroups = [];

    for (const columnId in columnDefinitions) {
        const columnDefOrGroup = columnDefinitions[columnId];
        const columnSize = (columnDefOrGroup.sizeInPercent * parentSize) / 100;

        if (isColumnGroupDef(columnDefOrGroup)) {
            const childColGroups = recursivelyBuildTableColumnGroups(columnDefOrGroup.subColumns, columnSize);

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

            let minWidth = getTextWidthWithFont(columnDefOrGroup.label, "Equinor", 1);
            // Padding
            minWidth += convertRemToPixels(2);

            if (columnDefOrGroup.sortable == null || columnDefOrGroup.sortable) {
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

export function useOptInControlledValue<TValue>(
    initialValue: TValue,
    controlledProp: TValue | undefined,
    onValueChange?: (newValue: TValue) => void,
): [TValue, (newValue: TValue) => void] {
    const useLocalValue = controlledProp === undefined;

    const [localValue, setLocalValue] = React.useState<TValue>(initialValue);

    const value = useLocalValue ? localValue : controlledProp;
    const setValue = React.useCallback(
        function setValue(newValue: TValue) {
            if (useLocalValue) setLocalValue(newValue);
            onValueChange?.(newValue);
        },
        [useLocalValue, onValueChange],
    );

    return [value, setValue];
}
