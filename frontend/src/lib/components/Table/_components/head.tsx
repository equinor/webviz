import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { useTableColumnContext } from "../_contexts/tableColumnContext";
import { TableSectionContext } from "../_contexts/tableSectionContext";

import { Cell } from "./cell";
import type { ColumnMetaData } from "./column";
import { Row } from "./row";
import type { TableCellProps } from "./types";

export type TableHeadProps = {
    /** When true, the header row sticks to the top of the scroll container. @default false */
    sticky?: boolean;
    /** The column definitions. */
    children?: React.ReactNode;
};

export const Head = React.forwardRef<HTMLTableSectionElement, TableHeadProps>(
    function Head(props, ref): React.ReactNode {
        const columnContext = useTableColumnContext();

        const headerRows = React.useMemo(
            () => recursivelyBuildHeaderRows(columnContext.columns, columnContext.maxDepth),
            [columnContext.columns, columnContext.maxDepth],
        );

        return (
            <TableSectionContext.Provider value="head">
                <thead
                    ref={ref}
                    className={resolveClassNames("bg-neutral-canvas text-neutral-strong border-neutral-subtle", {
                        "z-sticky sticky top-0": props.sticky,
                    })}
                >
                    {headerRows.map((row, rowIndex) => (
                        // eslint-disable-next-line @eslint-react/no-array-index-key -- Once built, we assume this as stable
                        <Row key={rowIndex} _columns={row.cols}>
                            {row.cells.map((cell, cellIndex) => (
                                <Cell
                                    // eslint-disable-next-line @eslint-react/no-array-index-key -- Once built, we assume this as stable
                                    key={`${rowIndex}-${cellIndex}`}
                                    {...cell.cellProps}
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
    },
);

type HeaderRowDef = {
    cols: ColumnMetaData[];
    cells: HeaderCellDef[];
};

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
    headerCellAcc: HeaderRowDef[],
): HeaderRowDef[] {
    if (!tableColumns.length) return headerCellAcc;

    if (!headerCellAcc[currentDepth]) {
        headerCellAcc[currentDepth] = {
            cols: [],
            cells: [],
        };
    }

    for (const column of tableColumns) {
        headerCellAcc[currentDepth].cols.push(column);

        if (column.columns.length) {
            doRecursivelyBuildHeaderRows(column.columns, maxDepth, currentDepth + 1, headerCellAcc);

            headerCellAcc[currentDepth].cells.push({
                isLeaf: false,
                rowSpan: 1,
                colSpan: column.leafCount,
                content: column.content,
                cellProps: column.cellProps,
            });
        } else {
            headerCellAcc[currentDepth].cells.push({
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
