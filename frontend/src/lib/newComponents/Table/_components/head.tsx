import React from "react";

import { useTableColumnContext } from "../_contexts/tableColumnContext";
import { TableSectionContext } from "../_contexts/tableSectionContext";
import { recursivelyBuildHeaderRows } from "../_utils";

import { Cell } from "./cell";
import { Row } from "./row";

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
            <thead ref={ref} className="bg-input text-neutral-strong border-neutral-subtle border-separate border-b-2">
                {tableRows.map((row, rowIndex) => (
                    <Row key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                            <Cell
                                {...cell.cellProps}
                                key={`${rowIndex}-${cellIndex}`}
                                rowSpan={cell.rowSpan}
                                colSpan={cell.colSpan}
                                // Explicitly avoid sortable group headers
                                sortable={cell.isLeaf ? undefined : false}
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

export const Head = React.forwardRef<HTMLTableSectionElement, TableHeadProps>(HeadComponent);
