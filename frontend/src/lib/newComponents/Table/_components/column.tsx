import React from "react";

import type { TableCellProps } from "./types";

export type TableColumnProps = TableCellProps;

export type ColumnMetaData = {
    cellProps: TableCellProps;
    content: React.ReactNode;
    columns: ColumnMetaData[];
    depth: number;
    maxDepth: number;
    leafCount: number;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ColumnComponent(_props: TableColumnProps, _ref: React.ForwardedRef<HTMLElement>): React.ReactNode {
    return null;
}

/**
 * This Component is virtual: it's just used to help developers structure the table
 */
export const Column = React.forwardRef<HTMLElement, TableColumnProps>(ColumnComponent);
