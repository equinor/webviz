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
