import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { useTableColumnContext } from "../_contexts/tableColumnContext";
import { TableSectionContext } from "../_contexts/tableSectionContext";

import { Cell } from "./cell";
import type { ColumnMetaData } from "./column";
import { Row } from "./row";
import type { TableCellProps } from "./types";

export type TableHeadProps = {
    sticky?: boolean;
    children?: React.ReactNode;
};

function HeadComponent(props: TableHeadProps, ref: React.ForwardedRef<HTMLTableSectionElement>): React.ReactNode {
    const columnContext = useTableColumnContext();

    const tableRows = React.useMemo(
        () => recursivelyBuildHeaderRows(columnContext.columns, columnContext.maxDepth),
        [columnContext.columns, columnContext.maxDepth],
    );

    return (
        <TableSectionContext.Provider value="head">
            <thead
                ref={ref}
                className={resolveClassNames("bg-input text-neutral-strong border-neutral-subtle", {
                    "z-elevated sticky top-0": props.sticky,
                })}
            >
                {tableRows.map((row, rowIndex) => (
                    <Row key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                            <Cell
                                {...cell.cellProps}
                                key={`${rowIndex}-${cellIndex}`}
                                rowSpan={cell.rowSpan}
                                colSpan={cell.colSpan}
                                // Explicitly avoid sortable group headers
                                sortable={cell.isLeaf ? cell.cellProps.sortable : false}
                            >
                                {cell.content}
                            </Cell>
                        ))}
                    </Row>
                ))}
                {columnContext.content}
            </thead>
        </TableSectionContext.Provider>
    );
}

type HeaderCellDef = {
    colSpan: number;
    rowSpan: number;
    content: React.ReactNode;
    isLeaf: boolean;
    cellProps: TableCellProps;
};

function recursivelyBuildHeaderRows(tableColumns: ColumnMetaData[], maxDepth: number) {
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

export const Head = React.forwardRef<HTMLTableSectionElement, TableHeadProps>(HeadComponent);
