import React from "react";

import { isEmpty, orderBy } from "lodash";
import { v4 } from "uuid";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { Virtualization } from "../Virtualization";

import { ALTERNATING_COLUMN_CELL_COLORS, ROW_HEIGHT_PX } from "./constants";
import { TableHead } from "./tableHead";
import { TableRow } from "./tableRow";
import type {
    ColGroupDef,
    TableCellDefinitions,
    TableFilters,
    TableSorting,
    TableData,
    TableColumns,
    TableDataWithKey,
    LoadedDataWithKey,
} from "./types";
import {
    computeTableMinWidth,
    defaultDataFilterPredicate,
    isLoadedDataRow,
    recursivelyBuildTableCellDefinitions,
    recursivelyBuildTableColumnGroups,
    useOptInControlledValue,
} from "./utils";

export type TableProps<T extends Record<string, any>> = {
    /** Main configuration for each table column */
    columns: TableColumns<T>;

    /** Each row of tabular data */
    rows: TableData<T>[];

    /**
     * Specifies a unique field for each data entry. This value is the one returned in selects, clicks, hovers, etc.
     * If none is specified, a random id will be generated,
     */
    rowIdentifier?: keyof T;

    /** Specifies that data collation will be applied outside of the component */
    controlledCollation?: boolean;

    height?: number | string;
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

    /** Callback for when the sorting order changes */
    onSortingChange?: (newValue: TableSorting) => void;
    /** Callback for when filter values changes */
    onFiltersChange?: (newValue: TableFilters) => void;
    /** Callback for when row selection changes */
    onSelectedRowsChange?: (newSelection: string[]) => void;

    /** @deprecated Use `onRowClick` instead */
    onClick?: (entry: T) => void;
    onRowClick?: (id: string, entry: T) => void;
    /** @deprecated use `onRowHover()` instead */
    onHover?: (entry: T | null) => void;
    onRowHover?: (id: string | null, entry: T | null) => void;

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

    const rowsWithKey = React.useMemo<TableDataWithKey<T>[]>(() => {
        return props.rows.map((r, i) => {
            if (!isLoadedDataRow(r)) return { _key: `__pending-${i}`, _pending: true };

            const key = !props.rowIdentifier ? v4() : r[props.rowIdentifier];
            if (!key) throw Error(`Empty value for row identifier "${String(props.rowIdentifier)}`);

            return { ...r, _key: String(key) };
        });
    }, [props.rows, props.rowIdentifier]);

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
            // ? Unsure why it couldn't infer correctly here
            if (!isLoadedDataRow<T>(row)) return true;

            for (const columnId in tableFilterState) {
                if (!(columnId in row)) {
                    console.warn(`Attempting to filter data on column ${columnId}, which doesnt exist`);
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
                className="relative overflow-auto border-y-2 border-slate-200"
                style={{ maxHeight: props.height, width: props.width }}
            >
                <table className="w-full text-sm table-fixed" style={{ minWidth: tableMinWidth }}>
                    {/* Create col-groups based on the top-level columns */}
                    <TableColGroups
                        colgroupDefinitions={colgroupDefinitions}
                        alternatingColumnColors={props.alternatingColumnColors}
                    />

                    <TableHead
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
                    />
                </table>
            </div>
        </>
    );
}

type TableColGroupsProps = {
    colgroupDefinitions: ColGroupDef[];
    alternatingColumnColors: boolean | undefined;
};

function TableColGroups(props: TableColGroupsProps): React.ReactNode {
    return (
        <>
            {props.colgroupDefinitions.map((colGroupDef, index) => {
                const colorIndex = props.alternatingColumnColors ? index % 2 : 1;
                const headerColorClass = ALTERNATING_COLUMN_CELL_COLORS[colorIndex];

                return (
                    <colgroup
                        key={colGroupDef.columnId}
                        className={resolveClassNames(headerColorClass, "border-x-2 border-gray-200")}
                    >
                        {colGroupDef.cols.map((colDef) => (
                            <col
                                key={colDef.columnId}
                                className="border-x-2 first:border-l-0 last:border-r-0"
                                style={{ width: `${colDef.width}%` }}
                            />
                        ))}
                    </colgroup>
                );
            })}
        </>
    );
}

type TableBodyProps<T extends Record<string, any>> = {
    rows: TableDataWithKey<T>[];
    wrapperElement: React.RefObject<HTMLElement>;
    height?: number | string;
    dataCellDefinitions: TableCellDefinitions<T>["dataCells"];
    selectedRows?: string[];
    selectable?: boolean;
    multiSelect?: boolean;
    onSelectedRowsChange?: (newSelection: string[]) => void;
    onRowClick?: (id: string, entry: LoadedDataWithKey<T>) => void;
    onRowHover?: (id: string | null, entry: LoadedDataWithKey<T> | null) => void;
};

function TableBody<T extends Record<string, any>>(props: TableBodyProps<T>): React.ReactNode {
    const { onSelectedRowsChange, onRowClick, onRowHover } = props;
    const handleRowClick = React.useCallback(
        function handleRowClick(entry: LoadedDataWithKey<T>, evt: React.MouseEvent) {
            onRowClick?.(entry._key, entry);

            if (!props.selectable) return;

            const selectedRows = props.selectedRows ?? [];
            const alreadySelected = selectedRows.includes(entry._key);

            // TODO: Should we make ctr and shift work as in windows? Adding one, vs adding a range?
            const additive = props.multiSelect && (evt.ctrlKey || evt.shiftKey);

            const newSelection = additive ? selectedRows.filter((key) => key !== entry._key) : [];

            if (!alreadySelected) newSelection.push(entry._key);

            onSelectedRowsChange?.(newSelection);
        },
        [onRowClick, onSelectedRowsChange, props.multiSelect, props.selectable, props.selectedRows],
    );

    const handleBodyMouseLeave = React.useCallback(() => onRowHover?.(null, null), [onRowHover]);
    const handleRowMouseOver = React.useCallback(
        (entry: LoadedDataWithKey<T>) => onRowHover?.(entry._key, entry),
        [onRowHover],
    );

    return (
        <tbody onMouseLeave={handleBodyMouseLeave}>
            <Virtualization
                containerRef={props.wrapperElement}
                direction="vertical"
                placeholderComponent="tr"
                items={props.rows}
                itemSize={ROW_HEIGHT_PX}
                renderItem={(row: TableDataWithKey<T>) => (
                    <TableRow
                        key={row._key}
                        row={row}
                        dataCellDefinitions={props.dataCellDefinitions}
                        selected={!!props.selectedRows?.includes(row._key)}
                        onClick={handleRowClick}
                        onMouseOver={handleRowMouseOver}
                    />
                )}
            />

            {props.rows.length === 0 && (
                <tr style={{ height: ROW_HEIGHT_PX * 2.5 }}>
                    <td
                        className="text-lg italic text-slate-600 text-center align-middle"
                        colSpan={props.dataCellDefinitions.length}
                    >
                        No data found
                    </td>
                </tr>
            )}
        </tbody>
    );
}
