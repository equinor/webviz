// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---

import type React from "react";

import type { TableCellProps } from "./_components/cell";

// - Table collation definitions - --- --- --- --- --- --- --- --- --- --- ---
export type TableSortState = {
    columnKey: string;
    direction: SortDirection;
};

export enum SortDirection {
    // As a convenience, the "asc" and "desc" strings match the direction args used in Lodash's orderBy util
    ASC = "asc",
    DESC = "desc",
    NONE = "none",
}
export type ColumnMetaData = {
    cellProps: TableCellProps;
    content: React.ReactNode;
    columns: ColumnMetaData[];
    depth: number;
    maxDepth: number;
    leafCount: number;
};
