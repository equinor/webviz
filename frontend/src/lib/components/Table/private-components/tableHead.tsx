import React from "react";

import { Close, ExpandLess, ExpandMore, Square } from "@mui/icons-material";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { Input } from "../../Input";
import { ALTERNATING_COLUMN_HEADING_COLORS, HEADER_HEIGHT_PX } from "../constants";
import type {
    HeaderCellDef,
    ColumnSorting,
    TableCellDefinitions,
    FilterCellDef,
    ColumnFilterImplementationProps,
    TableSorting,
    TableFilters,
} from "../types";
import { SortDirection } from "../types";

function getSortingForColumn(
    columnId: string,
    columnSortSettings: ColumnSorting[],
): undefined | { index: number; direction: SortDirection } {
    const settingIndex = columnSortSettings.findIndex((s) => s.columnId === columnId);

    if (settingIndex < 0) return undefined;

    return {
        direction: columnSortSettings[settingIndex].direction,
        index: settingIndex,
    };
}

function makeColumnSortingIcons(columnId: string, columnSortSettings: ColumnSorting[]): React.ReactNode {
    const columnSort = getSortingForColumn(columnId, columnSortSettings);
    const columnSortIndex = columnSort?.index ?? -1;

    return (
        <div
            className={resolveClassNames("ml-auto flex items-center", {
                // We keep it in the tree to keep spacing consistent
                invisible: !columnSort,
            })}
        >
            <div
                className={resolveClassNames(
                    "text-white bg-slate-300 rounded-full aspect-square h-5 text-center align-middle text-xs flex items-center justify-center",
                    {
                        invisible: columnSortSettings.length < 2,
                    },
                )}
            >
                {columnSortIndex + 1}
            </div>

            <div className="text-lg text-slate-500">
                {!columnSort?.direction && <Square fontSize="small" />}
                {columnSort?.direction === SortDirection.ASC && <ExpandLess fontSize="small" />}
                {columnSort?.direction === SortDirection.DESC && <ExpandMore fontSize="small" />}
            </div>
        </div>
    );
}

function toggleSortDirection(currentDirection: SortDirection | undefined): SortDirection | undefined {
    if (currentDirection === SortDirection.ASC) return SortDirection.DESC;
    if (currentDirection === SortDirection.DESC) return undefined;

    return SortDirection.ASC;
}

type HeaderCellProps = {
    alternatingColumnColors: boolean | undefined;
    columnSortSettings: ColumnSorting[];
    onSortHeader: (columnId: string, direction: SortDirection | undefined, useMultiSort: boolean) => void;
} & HeaderCellDef;

function HeaderCell(props: HeaderCellProps) {
    const colorIndex = props.alternatingColumnColors ? props.colGroupIndex % 2 : 1;
    const headerColorClass = ALTERNATING_COLUMN_HEADING_COLORS[colorIndex];
    const columnSort = getSortingForColumn(props.columnId, props.columnSortSettings);

    function handleHeaderClick(evt: React.MouseEvent<HTMLTableCellElement, MouseEvent>) {
        evt.preventDefault();
        evt.stopPropagation();

        if (!props.sortable) return;

        const newDirection = toggleSortDirection(columnSort?.direction);
        const useMultiSort = evt.ctrlKey;

        props.onSortHeader(props.columnId, newDirection, useMultiSort);
    }

    return (
        <th
            className={resolveClassNames(headerColorClass, "border-b-2 border-slate-200 px-2", {
                "hover:brightness-95 cursor-pointer": props.sortable,
            })}
            rowSpan={props.rowSpan}
            colSpan={props.colSpan}
            onClick={handleHeaderClick}
        >
            <div
                className={resolveClassNames("flex items-center", {
                    "justify-center": props.isGroup,
                    "justify-start": !props.isGroup,
                })}
            >
                <span title={props.hoverText}> {props.label} </span>
                {props.sortable && makeColumnSortingIcons(props.columnId, props.columnSortSettings)}
            </div>
        </th>
    );
}

export type TableHeadProps<T extends Record<string, any>> = {
    wrapperElement: React.RefObject<HTMLElement>;
    headerCellDefinitions: TableCellDefinitions<T>["headerCells"];
    filterCellDefinitions: TableCellDefinitions<T>["filterCells"];
    multiColumnSort?: boolean;
    alternatingColumnColors: boolean | undefined;
    tableSortState: TableSorting;
    tableFilterState: TableFilters;

    onTableSortStateChange: (newState: TableSorting) => void;
    onTableFilterStateChange: (newState: TableFilters) => void;
};

export function TableHead<T extends Record<string, any>>(props: TableHeadProps<T>): React.ReactNode {
    const { onTableSortStateChange, onTableFilterStateChange } = props;

    const hasFilters = props.filterCellDefinitions.some((def) => def.enabled);

    const handleColumnSortChange = React.useCallback(
        function handleColumnSortChange(columnId: string, direction: SortDirection | undefined, useMultiSort: boolean) {
            const isMultiSort = useMultiSort && props.multiColumnSort;

            let newSettings: TableSorting = isMultiSort ? props.tableSortState : [];

            // The entry might be in the list, so we remove it.
            newSettings = newSettings.filter((s) => s.columnId !== columnId);

            if (direction) {
                newSettings.push({ columnId, direction });
            }

            onTableSortStateChange(newSettings);
        },
        [props.multiColumnSort, props.tableSortState, onTableSortStateChange],
    );

    const handleTableFilterChange = React.useCallback(
        function handleTableFilterChange(columnId: string, newValue: unknown) {
            const newState = { ...props.tableFilterState };
            if (newValue == null) {
                delete newState[columnId];
            } else {
                newState[columnId] = newValue;
            }

            return onTableFilterStateChange(newState);
        },
        [onTableFilterStateChange, props.tableFilterState],
    );

    return (
        // ! Border styles. border-collapse and sticky headers doesn't play nice, so the borders
        // ! vanish when it floats. Using outlines here instead as a workaround
        <thead className="select-none border-b-2 border-slate-400 shadow sticky top-0 z-10 [&_th]:outline [&_th]:outline-slate-300">
            {props.headerCellDefinitions.map((headerRow, index) => (
                <tr key={`header-row-depth${index}`} style={{ height: HEADER_HEIGHT_PX }}>
                    {headerRow.map((cellDef) => {
                        return (
                            <HeaderCell
                                key={cellDef.columnId}
                                alternatingColumnColors={props.alternatingColumnColors}
                                columnSortSettings={props.tableSortState}
                                onSortHeader={handleColumnSortChange}
                                {...cellDef}
                            />
                        );
                    })}
                </tr>
            ))}

            {hasFilters && (
                <tr className="bg-slate-200" style={{ height: HEADER_HEIGHT_PX }}>
                    {props.filterCellDefinitions.map((filterDef) => {
                        return (
                            <FilterCell
                                key={filterDef.columnId}
                                tableFilterState={props.tableFilterState}
                                onTableFilterChange={handleTableFilterChange}
                                {...filterDef}
                            />
                        );
                    })}
                </tr>
            )}
        </thead>
    );
}

type FilterCellProps<T extends Record<string, any>> = {
    tableFilterState: TableFilters;
    onTableFilterChange: (columnId: string, newFilterValue: unknown) => void;
} & FilterCellDef<T>;

function FilterCell<T extends Record<string, any>>(props: FilterCellProps<T>): React.ReactNode {
    const { onTableFilterChange } = props;

    const handleFilterChange = React.useCallback(
        function handleFilterChange(newValue: unknown) {
            onTableFilterChange(props.columnId, newValue);
        },
        [onTableFilterChange, props.columnId],
    );

    const renderFunc = props.render ?? defaultFilterRender;

    if (!props.enabled) return <th />;
    return (
        <th className="text-xs">
            {renderFunc({
                value: props.tableFilterState[props.columnId],
                onFilterChange: handleFilterChange,
            })}
        </th>
    );
}

function defaultFilterRender(props: ColumnFilterImplementationProps<string>) {
    const value = props.value ?? "";

    if (value && typeof value !== "string")
        throw Error(`Default filter expects string value, but received type '${typeof value}'`);

    return (
        <Input
            type="text"
            value={value}
            placeholder="Filter ..."
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => props.onFilterChange(e.target.value || null)}
            endAdornment={
                <div
                    className="cursor-pointer text-gray-600 hover:text-gray-500 text-sm"
                    onClick={() => props.onFilterChange(null)}
                >
                    <Close fontSize="inherit" />
                </div>
            }
            wrapperStyle={{
                fontWeight: "normal",
                fontSize: "0.25rem",
            }}
        />
    );
}
