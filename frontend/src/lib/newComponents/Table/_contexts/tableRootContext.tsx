import React from "react";

import type { SortDirection, TableSortState } from "../typesAndEnums";

export type TableRootContextType = {
    availableBodyHeight: number;
    selectable?: boolean | "multiple";
    sortable?: boolean | "multiple";

    compact?: boolean;
    fixed?: boolean;

    rowSelection: string[];
    columnSort: TableSortState[];

    onColumnSort: (columnKey: string, direction: SortDirection, additive: boolean) => void;
    onRowSelect: (rowKey: string) => void;
};

export const TableRootContext = React.createContext<TableRootContextType | null>(null);

export function useTableRootContext(): TableRootContextType {
    const context = React.useContext(TableRootContext);

    if (!context) {
        throw new Error("Missing table root context. Table elements must be used within a Table.Root component.");
    }

    return context;
}
