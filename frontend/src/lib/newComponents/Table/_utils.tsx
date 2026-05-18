import type React from "react";

import type { TableCellProps } from "./_components/cell";
import { SortDirection, type ColumnMetaData } from "./typesAndEnums";

export function getNextSortDirection(currentSortDirection: SortDirection) {
    const directions = Object.values(SortDirection);

    const currentIndex = directions.indexOf(currentSortDirection);
    const nextIndex = (currentIndex + 1) % directions.length;

    return directions[nextIndex];
}

type HeaderCellDef = {
    colSpan: number;
    rowSpan: number;
    content: React.ReactNode;
    isLeaf: boolean;
    cellProps: TableCellProps;
};

export function recursivelyBuildHeaderRows(tableColumns: ColumnMetaData[], maxDepth: number) {
    return doRecursivelyBuildHeaderRows(tableColumns, maxDepth, 0, []);
}

function doRecursivelyBuildHeaderRows(
    tableColumns: ColumnMetaData[],
    maxDepth: number,
    currentDepth: number,
    // ! Object is mutated as the method runs
    headerCellAcc: HeaderCellDef[][],
): HeaderCellDef[][] {
    if (!tableColumns.length) return headerCellAcc;

    if (!headerCellAcc[currentDepth]) {
        headerCellAcc[currentDepth] = [];
    }

    for (const column of tableColumns) {
        if (column.columns.length) {
            doRecursivelyBuildHeaderRows(column.columns, maxDepth, currentDepth + 1, headerCellAcc);

            headerCellAcc[currentDepth].push({
                isLeaf: false,
                rowSpan: 1,
                colSpan: column.leafCount,
                content: column.content,
                cellProps: column.cellProps,
            });
        } else {
            headerCellAcc[currentDepth].push({
                isLeaf: true,
                rowSpan: maxDepth - currentDepth + 1,
                colSpan: 1,
                content: column.content,
                cellProps: column.cellProps,
            });
        }
    }

    return headerCellAcc;
}
