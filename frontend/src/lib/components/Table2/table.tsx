import React from "react";

import { isEmpty, orderBy } from "lodash";
import { v4 } from "uuid";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { Virtualization } from "../Virtualization";

import { ALTERNATING_COLUMN_CELL_COLORS, ROW_HEIGHT_PX } from "./constants";
import { TableHead } from "./tableHead";
import { TableRow } from "./tableRow";
import type {
    ColumnDefMap,
    TableRowData,
    ColGroupDef,
    TableCellDefinitions,
    TableFilters,
    TableSorting,
    TableRowWithKey,
} from "./types";
import {
    defaultDataFilterPredicate,
    recursivelyBuildTableCellDefinitions,
    recursivelyBuildTableColumnGroups,
    useOptInControlledValue,
} from "./utils";

export type TableProps<T extends ColumnDefMap> = {
    /** Main configuration for each table column */
    columnDefMap: T;

    /** Each row of tabular data */
    rows: TableRowData<T>[];
    /** Specifies that data collation will be applied outside of the component */
    controlledRows?: boolean;

    /** Height of the entire table */
    height?: number | string;

    /** Colors every other column group with darker cells */
    alternatingColumnColors?: boolean;

    /** Selected/highlighted row */
    selectedRows?: string[];
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

    // TODO: Other QoL things to add?
    // * Specify height with row count instead?
    // numVisibleRows?: number;
    rowIdentifier?: string;

    // selectable?: boolean | "multiple";

    /** @deprecated use `onRowHover()` instead */
    // onHover?: (row: TableRowData<T> | null) => void;
    // onRowHover?: (row: TableRowData<T> | null) => void;
};

export function Table<T extends ColumnDefMap>(props: TableProps<T>): React.ReactNode {
    const divWrapperRef = React.useRef<HTMLDivElement>(null);

    const tableCellDefinitions = React.useMemo(() => {
        return recursivelyBuildTableCellDefinitions(props.columnDefMap);
    }, [props.columnDefMap]);

    const colDataDefLookup = React.useMemo(() => {
        return Object.fromEntries(tableCellDefinitions.dataCells.map((cell) => [cell.columnId, cell]));
    }, [tableCellDefinitions.dataCells]);

    const colgroupDefinitions = React.useMemo(() => {
        return recursivelyBuildTableColumnGroups(props.columnDefMap);
    }, [props.columnDefMap]);

    const [selectedRows, setSelectedRows] = useOptInControlledValue([], props.selectedRows, props.onSelectedRowsChange);

    const [tableSortState, setTableSortState] = useOptInControlledValue([], props.sorting, props.onSortingChange);
    const [tableFilterState, setTableFilterState] = useOptInControlledValue({}, props.filters, props.onFiltersChange);

    const rowsWithKey = React.useMemo(() => {
        return props.rows.map((r) => {
            const key = !props.rowIdentifier ? v4() : r[props.rowIdentifier];
            if (!key) throw new Error(`Empty value for row identifier "${props.rowIdentifier}`);
            return { ...r, _key: key.toString() };
        });
    }, [props.rows, props.rowIdentifier]);

    const filteredRows = React.useMemo(() => {
        if (props.controlledRows) return rowsWithKey;
        if (isEmpty(tableFilterState)) return rowsWithKey;

        return rowsWithKey.filter((row) => {
            for (const columnId in tableFilterState) {
                const filterValue = tableFilterState[columnId];
                const dataValue = row[columnId];
                const dataDefinition = colDataDefLookup[columnId];

                if (dataValue === null) continue;

                const filterFunc = dataDefinition.filter ? dataDefinition.filter : defaultDataFilterPredicate;

                if (filterFunc(dataValue, filterValue, dataDefinition, row)) return false;
            }

            return true;
        });
    }, [props.controlledRows, rowsWithKey, tableFilterState, colDataDefLookup]);

    const sortedRows = React.useMemo(() => {
        if (props.controlledRows) return filteredRows;

        // Apply filtering
        const fieldIterateeSetting = [];
        const dirIterateeSetting = [];

        for (const setting of tableSortState) {
            fieldIterateeSetting.push(setting.columnId);
            dirIterateeSetting.push(setting.direction);
        }

        return orderBy(filteredRows, fieldIterateeSetting, dirIterateeSetting);
    }, [tableSortState, props.controlledRows, filteredRows]);

    return (
        <>
            <div ref={divWrapperRef} className="relative overflow-auto" style={{ height: props.height }}>
                <table className="w-full border-x border-slate-500 text-sm table-fixed">
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
                        multiSelect={props.multiSelect}
                        onSelectedRowsChange={setSelectedRows}
                    />
                </table>
            </div>
            <span className="text-xs italic text-right text-gray-600 mt-1">
                {selectedRows?.length ?? 0} rows selected
            </span>
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
                const borderColor = props.alternatingColumnColors ? "border-slate-400" : "border-gray-200";

                return (
                    <colgroup
                        key={colGroupDef.columnId}
                        className={resolveClassNames(headerColorClass, "border-x-2", borderColor)}
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

type TableBodyProps<T extends ColumnDefMap> = {
    wrapperElement: React.RefObject<HTMLElement>;
    height?: number | string;
    dataCellDefinitions: TableCellDefinitions["dataCells"];
    rows: TableRowWithKey<T>[];
    selectedRows?: string[];
    multiSelect?: boolean;
    onSelectedRowsChange?: (newSelection: string[]) => void;
};

function TableBody<T extends ColumnDefMap>(props: TableBodyProps<T>): React.ReactNode {
    const { onSelectedRowsChange } = props;
    const handleRowClick = React.useCallback(
        function handleRowClick(row: TableRowWithKey<T>, evt: React.MouseEvent) {
            const selectedRows = props.selectedRows ?? [];
            const alreadySelected = row._selected;

            // TODO: Should we make ctr and shift work as in windows? Add one and add range?
            const additive = props.multiSelect && (evt.ctrlKey || evt.shiftKey);

            const newSelection = additive ? selectedRows.filter((key) => key !== row._key) : [];

            if (!alreadySelected) newSelection.push(row._key);

            onSelectedRowsChange?.(newSelection);
        },
        [onSelectedRowsChange, props.multiSelect, props.selectedRows],
    );

    return (
        <tbody>
            <Virtualization
                containerRef={props.wrapperElement}
                direction="vertical"
                placeholderComponent="tr"
                items={props.rows}
                itemSize={ROW_HEIGHT_PX}
                renderItem={(row) => (
                    <TableRow
                        key={row._key}
                        rowData={row}
                        dataCellDefinitions={props.dataCellDefinitions}
                        selected={!!props.selectedRows?.includes(row._key)}
                        onRowClick={handleRowClick}
                    />
                )}
            />

            {props.rows.length === 0 && (
                <tr style={{ height: ROW_HEIGHT_PX * 2.5 }}>
                    <td
                        className="text-lg italic text-slate-600 text-center align-middle border-x-0 border-b-2 border-slate-200"
                        colSpan={props.dataCellDefinitions.length}
                    >
                        No data found
                    </td>
                </tr>
            )}
        </tbody>
    );
}
