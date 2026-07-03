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

/**
 * This Component is virtual: it's just used to help developers structure the table
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const Column = React.forwardRef<HTMLElement, TableColumnProps>(function Column(_props, _ref): React.ReactNode {
    return null;
});
