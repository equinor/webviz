import React from "react";

export interface Column {
    readonly key: string;
    readonly name: string | React.ReactElement;
    readonly width?: number | string;
    readonly mindWidth?: number;
    readonly maxWidth?: number;
    readonly resizable?: boolean;
    readonly sortable?: boolean;
}

export interface DataGridProps<TRow> {
    columns: readonly Column[];
    rows: readonly TRow[];
    rowHeight?: number;
    headerRowHeight?: number;
    enableVirtualization?: boolean;
}

export const DataGrid = <TRow extends Record<string, unknown>>(props: DataGridProps<TRow>) => {
    return null;
};
