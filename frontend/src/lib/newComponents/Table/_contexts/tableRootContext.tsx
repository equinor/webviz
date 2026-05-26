import React from "react";

import type { SortDirection } from "../typesAndEnums";

export type TableRootContextType = {
    sortable?: boolean;
    selectable?: boolean;
    compact?: boolean;

    selection?: null | string | string[];

    currentSort?: { [colKey: string]: SortDirection };
    onColumnSort?: (columnKey: string, direction: SortDirection) => void;

    selectedRow?: string | null;
    onRowSelect?: (rowKey: string) => void;
};

export const TableRootContext = React.createContext<TableRootContextType | null>(null);

export function useTableRootContext(): TableRootContextType {
    const context = React.useContext(TableRootContext);

    if (!context) {
        throw new Error("Missing table root context. Table elements must be used within a Table.Root component.");
    }

    return context;
}
