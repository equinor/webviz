// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---

import type React from "react";

import type { TableCellProps } from "./_components/cell";

// - Table collation definitions - --- --- --- --- --- --- --- --- --- --- ---
export enum SortDirection {
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
