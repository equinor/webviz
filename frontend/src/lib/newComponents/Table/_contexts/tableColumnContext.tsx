import React from "react";

import type { ColumnMetaData } from "../typesAndEnums";

export type TableColumnContextType = {
    columns: ColumnMetaData[];
    content: React.ReactNode;
    maxDepth: number;
    leafCount: number;
};

export const TableColumnContext = React.createContext<TableColumnContextType | null>(null);

export function useTableColumnContext(): TableColumnContextType {
    const context = React.useContext(TableColumnContext);

    if (!context) {
        throw new Error("Missing table column context. Table elements must be used within a Table.Root component.");
    }

    return context;
}
