import React from "react";

import type { ColumnMetaData } from "../_components/column";

/** The leaf column a body cell sits under, matched by position within its row. `null` outside body rows. */
export const TableCellColumnContext = React.createContext<ColumnMetaData | null>(null);

export function useTableCellColumnContext(): ColumnMetaData | null {
    return React.useContext(TableCellColumnContext);
}
