import type React from "react";

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// - Table column configuration
export type DataColumn<TData extends Record<string, any>, TK extends keyof TData> = {
    _type: "data";
    columnId: TK;
    label: string;
    sizeInPercent: number;

    hoverText?: string;
    /** @default true */
    sortable?: boolean;

    filter?: boolean | CustomColumnFilter<TData, TK>;

    formatValue?: (value: TData[TK], entry: TData) => string;
    formatStyle?: (value: TData[TK], entry: TData) => React.CSSProperties;
    renderData?: (value: TData[TK], entry: TData) => React.ReactNode;
};

type DataColumnAllKeys<TData extends Record<string, any>> = {
    [TK in keyof TData]: DataColumn<TData, TK>;
}[Extract<keyof TData, string>];

// TODO -- Future work: Allow virtual columns, not directly tied to a data-value
// export type VirtualColumn<TData extends Record<string, any>> = {
//     _virtual: true;
//     columnId: string;
//     label: string;
//     sizeInPercent: number;

//     // Requires a render function
//     render: (datum: TData) => React.ReactNode;
// };

export type ColumnGroup<TData extends Record<string, any>> = {
    _type: "group";
    label: string;
    columnId: string;
    hoverText?: string;
    sizeInPercent: number;
    subColumns: TableColumn<TData>[];
};

export type TableColumn<TData extends Record<string, any>> = DataColumnAllKeys<TData> | ColumnGroup<TData>;
//  | VirtualColumn<TData>

export type TableColumns<TData extends Record<string, any>> = TableColumn<TData>[];

export interface ColumnFilterImplementationProps<TFilterVal = any> {
    value: TFilterVal | null | undefined;
    onFilterChange: (newValue: TFilterVal | null | undefined) => void;
}

export type CustomColumnFilter<TData extends Record<string, any>, TDataKey extends keyof TData> = {
    render?: (props: ColumnFilterImplementationProps<any>) => React.ReactNode;
    predicate?: (
        filterValue: any,
        dataValue: TData[TDataKey],
        dataDef: DataCellDef<TData, TDataKey>,
        entry: TData,
    ) => boolean;
};

export type PendingDataWithKey = { _key: string; _pending: true };
export type LoadedDataWithKey<TData extends Record<string, any>> = { _key: string } & TData;
export type TableDataWithKey<TData extends Record<string, any>> = PendingDataWithKey | LoadedDataWithKey<TData>;

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// - Table cell definitions -- --- --- --- --- --- --- --- --- --- --- --- ---
export type HeaderCellDef = {
    columnId: string;
    colSpan: number;
    rowSpan: number;
    colGroupIndex: number;
    sortable: boolean;
    isGroup: boolean;
    label: string;
    hoverText?: string;
};

export type FilterCellDef<TData extends Record<string, any>> = {
    columnId: string;
    enabled: boolean;
    colGroupIndex: number;
    render?: CustomColumnFilter<TData, any>["render"];
};

export type DataCellDef<TData extends Record<string, any>, TK extends keyof TData> = {
    columnId: keyof TData;
    colGroupIndex: number;
    format?: (value: TData[TK], entry: TData) => string;
    style?: (value: TData[TK], entry: TData) => React.CSSProperties;
    render?: (value: TData[TK], entry: TData) => React.ReactNode;
    filter?: CustomColumnFilter<TData, TK>["predicate"];
};

export type TableCellDefinitions<TData extends Record<string, any>> = {
    headerCells: HeaderCellDef[][];
    filterCells: FilterCellDef<TData>[];
    dataCells: { [TK in keyof TData]: DataCellDef<TData, TK> }[keyof TData][];
};

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// - Table collation definitions - --- --- --- --- --- --- --- --- --- --- ---
export enum SortDirection {
    ASC = "asc",
    DESC = "desc",
}

export type ColumnSorting = {
    columnId: string;
    direction: SortDirection;
};

export type TableSorting = ColumnSorting[];

export type TableFilters = {
    // The filter object is intentionally kept simple and wont bother with ensuring keys match data column ids (since we might have filters for virtual columns at some later point)
    [columnId: string]: any;
};

export type ColDef = {
    columnId: string;
    width: number;
    minWidth: number;
};

export type ColGroupDef = {
    columnId: string;
    cols: ColDef[];
};
