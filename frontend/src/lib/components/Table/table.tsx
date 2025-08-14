import React from "react";

import { isEmpty, orderBy, range } from "lodash";
import { v4 } from "uuid";

import { useElementSize } from "@lib/hooks/useElementSize";

import { ROW_HEIGHT_PX } from "./constants";
import { useOptInControlledValue } from "./hooks";
import { TableBody } from "./private-components/tableBody";
import { TableColGroups } from "./private-components/tableColGroups";
import { TableHead } from "./private-components/tableHead";
import type { TableFilters, TableSorting, TableColumns, TableDataWithKey } from "./types";
import {
    computeTableMinWidth,
    defaultDataFilterPredicate,
    isLoadedDataRow,
    recursivelyBuildTableCellDefinitions,
    recursivelyBuildTableColumnGroups,
} from "./utils";

export type TableProps<T extends Record<string, any>> = {
    /** Main configuration for each table column */
    columns: TableColumns<T>;

    /** Each row of tabular data */
    rows: T[];

    /**
     * The amount of pending rows to display at the bottom of the table.
     * If the string "fill" is provided, the table will add enough rows to fill the entire table
     */
    numPendingRows?: number | "fill";

    /**
     * Specifies a unique field for each data entry. This value is the one returned in selects, clicks, hovers, etc.
     * If none is specified, a random id will be generated,
     */
    rowIdentifier?: keyof T;

    /** Specifies that data collation will be applied outside of the component */
    controlledCollation?: boolean;

    height?: number | string;
    maxHeight?: number | string;
    width?: number | string;

    /** Colors every other column group with darker cells */
    alternatingColumnColors?: boolean;

    /** Selected/highlighted row */
    selectedRows?: string[];
    /** Enable row selection. */
    selectable?: boolean;

    /** Allow multiple elements to be selected */
    multiSelect?: boolean;

    /** Sorting order for one or more table columns */
    sorting?: TableSorting;
    /** Filter values for one ore more table columns */
    filters?: TableFilters;

    /** Allow sorting on multiple columns at the same time */
    multiColumnSort?: boolean;

    /** Callback for when the sorting order changes */
    onSortingChange?: (newValue: TableSorting) => void;
    /** Callback for when filter values changes */
    onFiltersChange?: (newValue: TableFilters) => void;
    /** Callback for when row selection changes */
    onSelectedRowsChange?: (newSelection: string[]) => void;

    /** @deprecated Use `onRowClick` instead */
    onClick?: (entry: T) => void;
    /** Callback for when a row is clicked */
    onRowClick?: (id: string, entry: T) => void;
    /** @deprecated use `onRowHover()` instead */
    onHover?: (entry: T | null) => void;
    /** Callback for when a row is hovered */
    onRowHover?: (id: string | null, entry: T | null) => void;

    /** Callback for when the virtualized row range changes */
    onVisibleRowRangeChange?: (startIndex: number, endIndex: number) => void;
    // TODO: Other QoL things to add?
    // * Specify height with row count instead?
    // numVisibleRows?: number;
};

function validateProps<T extends Record<string, any>>(props: TableProps<T>) {
    if (props.selectable && !props.rowIdentifier) {
        console.warn("Table is selectable, but no row identifier has been specified");
    }

    const totalColSize = props.columns.reduce((acc, def) => acc + def.sizeInPercent, 0);

    if (totalColSize !== 100) {
        console.warn(`Total column width sums to ${totalColSize}%, not 100%`);
    }
}

export function Table<T extends Record<string, any>>(props: TableProps<T>): React.ReactNode {
    validateProps(props);

    const { onHover, onRowHover } = props;

    const divWrapperRef = React.useRef<HTMLDivElement>(null);
    const wrapperSize = useElementSize(divWrapperRef);

    const tableCellDefinitions = React.useMemo(() => {
        return recursivelyBuildTableCellDefinitions(props.columns);
    }, [props.columns]);

    const colDataDefLookup = React.useMemo(() => {
        return Object.fromEntries(tableCellDefinitions.dataCells.map((cell) => [cell.columnId, cell]));
    }, [tableCellDefinitions.dataCells]);

    const colgroupDefinitions = React.useMemo(() => {
        return recursivelyBuildTableColumnGroups(props.columns);
    }, [props.columns]);

    const tableMinWidth = React.useMemo(() => {
        return computeTableMinWidth(colgroupDefinitions);
    }, [colgroupDefinitions]);

    const [selectedRows, setSelectedRows] = useOptInControlledValue([], props.selectedRows, props.onSelectedRowsChange);

    const [tableSortState, setTableSortState] = useOptInControlledValue([], props.sorting, props.onSortingChange);
    const [tableFilterState, setTableFilterState] = useOptInControlledValue({}, props.filters, props.onFiltersChange);

    // Table height can be defined using css strings (for instance 50%). If the table should
    // be filled with pending rows, we need it to be grow to it's full height on the first
    // render so we can compute how many rows it can fit.
    const preferredHeight = React.useMemo(() => {
        if (props.numPendingRows === "fill") {
            return props.height ?? props.maxHeight ?? "100%";
        }

        return props.height;
    }, [props.height, props.maxHeight, props.numPendingRows]);

    const numberOfPendingRows = React.useMemo(() => {
        if (!props.numPendingRows) {
            return 0;
        }
        if (props.numPendingRows === "fill") {
            const numHeaderRows = tableCellDefinitions.headerCells.length;
            const numFilterRows = tableCellDefinitions.filterCells.length ? 1 : 0;

            const maxRowsInTable = Math.floor(wrapperSize.height / ROW_HEIGHT_PX);

            return Math.max(0, maxRowsInTable - numHeaderRows - numFilterRows - props.rows.length);
        }

        return props.numPendingRows;
    }, [
        props.numPendingRows,
        props.rows.length,
        tableCellDefinitions.filterCells.length,
        tableCellDefinitions.headerCells.length,
        wrapperSize.height,
    ]);

    const rowsWithKey = React.useMemo<TableDataWithKey<T>[]>(() => {
        const dataRowsWithKeys = props.rows.map<TableDataWithKey<T>>((r) => {
            const key = !props.rowIdentifier ? v4() : r[props.rowIdentifier];
            if (!key)
                throw Error(
                    `Row identifier field "${String(props.rowIdentifier)}" is empty for row. Ensure all data rows have a valid value for the specified identifier field.`,
                );

            return { ...r, _key: String(key) };
        });

        const pendingDataRows = range(0, numberOfPendingRows).map<TableDataWithKey<T>>((n) => {
            return { _key: `__pending-${n}`, _pending: true };
        });

        return dataRowsWithKeys.concat(pendingDataRows);
    }, [props.rows, props.rowIdentifier, numberOfPendingRows]);

    const [prevRowsWithKeys, setPrevRowsWithKeys] = React.useState(rowsWithKey);

    // If data keys were regenerated, the rows selected are invalid
    if (prevRowsWithKeys !== rowsWithKey) {
        setPrevRowsWithKeys(rowsWithKey);
        if (!props.rowIdentifier) {
            console.warn("Data keys are being regenerated, discarding selection");
            setSelectedRows([]);
        }
    }

    const filteredRows = React.useMemo(() => {
        if (props.controlledCollation) return rowsWithKey;
        if (isEmpty(tableFilterState)) return rowsWithKey;

        return rowsWithKey.filter((row) => {
            if (!isLoadedDataRow(row)) return true;

            for (const columnId in tableFilterState) {
                if (!(columnId in row)) {
                    console.warn(`Attempting to filter data on column ${columnId}, which doesn't exist`);
                    continue;
                }

                const filterValue = tableFilterState[columnId];

                const dataValue = row[columnId];
                const dataDefinition = colDataDefLookup[columnId];

                if (dataValue == null) continue;

                const filterFunc = dataDefinition.filter ? dataDefinition.filter : defaultDataFilterPredicate;

                if (!filterFunc(filterValue, dataValue, dataDefinition, row)) return false;
            }

            return true;
        });
    }, [props.controlledCollation, rowsWithKey, tableFilterState, colDataDefLookup]);

    const sortedRows = React.useMemo(() => {
        if (props.controlledCollation) return filteredRows;

        // Apply filtering
        const fieldIterateeSetting = [];
        const dirIterateeSetting = [];

        for (const setting of tableSortState) {
            fieldIterateeSetting.push(setting.columnId);
            dirIterateeSetting.push(setting.direction);
        }

        return orderBy(filteredRows, fieldIterateeSetting, dirIterateeSetting);
    }, [tableSortState, props.controlledCollation, filteredRows]);

    const handleRowHover = React.useCallback(
        function handleRowHover(id: string | null, entry: T | null) {
            onHover?.(entry);
            onRowHover?.(id, entry);
        },
        [onHover, onRowHover],
    );

    return (
        <>
            <div
                ref={divWrapperRef}
                className="relative overflow-auto border-t-2 border-slate-200"
                style={{
                    height: preferredHeight,
                    maxHeight: props.maxHeight,
                    width: props.width,
                }}
            >
                <table className="w-full text-sm table-fixed" style={{ minWidth: tableMinWidth }}>
                    {/* Create col-groups based on the top-level columns */}
                    <TableColGroups
                        colgroupDefinitions={colgroupDefinitions}
                        alternatingColumnColors={props.alternatingColumnColors}
                    />

                    <TableHead
                        multiColumnSort={props.multiColumnSort}
                        wrapperElement={divWrapperRef}
                        headerCellDefinitions={tableCellDefinitions.headerCells}
                        filterCellDefinitions={tableCellDefinitions.filterCells}
                        alternatingColumnColors={!!props.alternatingColumnColors}
                        tableSortState={tableSortState}
                        tableFilterState={tableFilterState}
                        onTableSortStateChange={setTableSortState}
                        onTableFilterStateChange={setTableFilterState}
                    />

                    <TableBody
                        wrapperElement={divWrapperRef}
                        dataCellDefinitions={tableCellDefinitions.dataCells}
                        rows={sortedRows}
                        height={props.height}
                        selectedRows={selectedRows}
                        selectable={props.selectable ?? props.multiSelect}
                        multiSelect={props.multiSelect}
                        onSelectedRowsChange={setSelectedRows}
                        onRowHover={handleRowHover}
                        onVisibleRowRangeChange={props.onVisibleRowRangeChange}
                    />
                </table>

                {/* 
                    We fake the border at the bottom of the table so it still shows when elements overflow
                    (but still follows the table body height when dealing with locked table-heights)    
                */}
                <div className="border-b-2 sticky b-0" />
            </div>
        </>
    );
}
