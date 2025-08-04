import type React from "react";

export type ColumnGroup = {
    label: string;
    hoverText: string;
    subColumns: ColumnDefMap;
    sizeInPercent: number;
};

export interface ColumnFilterImplementationProps<TFilterValue> {
    value: TFilterValue | null | undefined;
    onFilterChange: (newValue: TFilterValue | null | undefined) => void;
}

type CustomColumnFilter<TFilterValue> = {
    render?: (props: ColumnFilterImplementationProps<TFilterValue>) => React.ReactNode;
    predicate?: (
        dataValue: string | number | null,
        filterValue: TFilterValue,
        dataDef: DataCellDef,
        entry: TableRowData<any>,
    ) => boolean;
};

export type ColumnDef = {
    label: string;
    hoverText?: string;
    sortable?: boolean;
    sizeInPercent: number;

    filter?: boolean | CustomColumnFilter<any>;

    formatValue?: (value: any | null) => string;
    formatStyle?: (value: any | null) => React.CSSProperties;
    renderData?: (value: any | null, entry: any) => React.ReactNode;
    // TODO: Allow defining custom render for special case data (f-eks tag list, or actions)
    // renderData?: (data: any, entry, columnDef: ColumnDef) => React.ReactNode;
};

export type ColumnDefMap = { [columnKey: string]: ColumnDef | ColumnGroup };

export type BaseHeadingCellInfo = {
    id: string;
    colSpan: number;
    rowSpan: number;
    topLevelColumnIndex: number;
    depth: number;
};

export type TableRowData<T extends ColumnDefMap> = {
    [key in keyof T]: string | number | null;
};

export type TableRowWithKey<T extends ColumnDefMap> = { _key: string } & TableRowData<T>;

export enum SortDirection {
    ASC = "asc",
    DESC = "desc",
}

export type DataCellDef = {
    columnId: string;
    colGroupIndex: number;
    format?: (value: any | null, entry: any) => string;
    style?: (value: any | null, entry: any) => React.CSSProperties;
    render?: (value: any | null, entry: any) => React.ReactNode;
    filter?: CustomColumnFilter<any>["predicate"];
};

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

export type FilterCellDef = {
    columnId: string;
    enabled: boolean;
    colGroupIndex: number;
    render?: CustomColumnFilter<any>["render"];
};

// Table collation types
export type ColumnSorting = {
    columnId: string;
    direction: SortDirection;
};

export type TableSorting = ColumnSorting[];
export type TableFilters = {
    [columnId: string]: any;
};

export type TableCellDefinitions = {
    headerCells: HeaderCellDef[][];
    dataCells: DataCellDef[];
    filterCells: FilterCellDef[];
};

export type ColDef = {
    columnId: string;
    width: number;
};

export type ColGroupDef = {
    columnId: string;
    cols: ColDef[];
};
