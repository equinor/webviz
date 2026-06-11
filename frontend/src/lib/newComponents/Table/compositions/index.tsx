import { PendingRow, PendingRows } from "./pendingRows";
import { VirtualizedRows } from "./virtualizedRows";

export type { VirtualizedRowsProps } from "./virtualizedRows";
export type { PendingRowsProps } from "./pendingRows";

export const TableCompositions = {
    PendingRows,
    PendingRow,
    VirtualizedRows,
} as const;
