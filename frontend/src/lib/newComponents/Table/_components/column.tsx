import React from "react";

import type { TableCellProps } from "./cell";

export type TableColumnProps = TableCellProps;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ColumnComponent(_props: TableColumnProps, _ref: React.ForwardedRef<HTMLElement>): React.ReactNode {
    return null;
}

/**
 * This Component is virtual: it's just used to help developers structure the table
 */
export const Column = React.forwardRef<HTMLElement, TableColumnProps>(ColumnComponent);
