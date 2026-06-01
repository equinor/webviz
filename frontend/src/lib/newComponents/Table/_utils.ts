import React from "react";

import { Body } from "./_components/body";
import type { TableCellProps } from "./_components/cell";
import { Foot } from "./_components/foot";
import { Head } from "./_components/head";
import { SortDirection, type ColumnMetaData } from "./typesAndEnums";

export function getNextSortDirection(currentSortDirection: SortDirection) {
    const directions = [SortDirection.DESC, SortDirection.ASC, SortDirection.NONE];

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

/** The table head component *might* be wrapped in virtual context components, so we need to recursively dig down for it */
export function recursivelyFindHeadChild(children: React.ReactNode): React.ReactElement | null {
    return doRecursivelyFindHeadChild(children);
}

function doRecursivelyFindHeadChild(children: React.ReactNode, depth = 0): React.ReactElement | null {
    if (depth > 100) throw new Error("Maximum table child depth exceeded. Check for circular references");

    for (const child of React.Children.toArray(children)) {
        if (!React.isValidElement(child)) continue;

        // Per html syntax, head cannot be in inside the footer or body, so we'll just skip them
        if (child.type === Foot) continue;
        if (child.type === Body) continue;
        if (child.type === Head) return child;

        if (child.props?.children) {
            // Recursively check element children
            return doRecursivelyFindHeadChild(child.props?.children, depth + 1);
        }
    }

    return null;
}
