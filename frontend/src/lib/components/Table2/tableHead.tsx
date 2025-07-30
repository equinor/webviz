import React from "react";

import { Close, ExpandLess, ExpandMore, Square } from "@mui/icons-material";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { Input } from "../Input";

import { ALTERNATING_COLUMN_HEADING_COLORS, HEADER_HEIGHT_PX } from "./constants";
import type { HeaderCellDef, ColumnSortSetting, TableCellDefinitions } from "./types";
import { SortDirection } from "./types";

function getSortingForColumn(
    columnId: string,
    columnSortSettings: ColumnSortSetting[],
): undefined | { index: number; direction: SortDirection } {
    const settingIndex = columnSortSettings.findIndex((s) => s.columnId === columnId);

    if (settingIndex < 0) return;

    return {
        direction: columnSortSettings[settingIndex].direction,
        index: settingIndex,
    };
}

function makeColumnSortingIcons(columnId: string, columnSortSettings: ColumnSortSetting[]): React.ReactNode {
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

function toggleSortDirection(currentDirection: SortDirection | undefined): SortDirection {
    if (currentDirection === SortDirection.ASC) return SortDirection.DESC;
    if (currentDirection === SortDirection.DESC) return SortDirection.ASC;

    return SortDirection.ASC;
}

type HeaderCellProps = {
    alternatingColumnColors: boolean | undefined;
    columnSortSettings: ColumnSortSetting[];
    onSortHeader: (columnId: string, direction: SortDirection, additive: boolean) => void;
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
        const additive = evt.shiftKey;

        props.onSortHeader(props.columnId, newDirection, additive);
    }

    return (
        <th
            className={resolveClassNames(headerColorClass, "border-y-2 border-slate-200 px-2", {
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
                {makeColumnSortingIcons(props.columnId, props.columnSortSettings)}
            </div>
        </th>
    );
}

export type TableHeadProps = {
    wrapperElement: React.RefObject<HTMLElement>;
    headerCellDefinitions: TableCellDefinitions["headerCells"];
    filterCellDefinitions: TableCellDefinitions["filterCells"];

    alternatingColumnColors: boolean | undefined;

    columnSortSettings: ColumnSortSetting[];

    onColumnSortingChange: (newSettings: ColumnSortSetting[]) => void;
};

export function TableHead(props: TableHeadProps): React.ReactNode {
    const { onColumnSortingChange } = props;

    const hasFilters = props.filterCellDefinitions.some((def) => def.enabled);

    const handleHeaderSort = React.useCallback(
        function handleHeaderSort(columnId: string, direction: SortDirection, additive: boolean) {
            const newSetting: ColumnSortSetting = { columnId, direction };

            let newSettings;

            if (!additive) {
                newSettings = [newSetting];
            } else {
                const filteredSettings = props.columnSortSettings.filter((s) => s.columnId != columnId);

                newSettings = [...filteredSettings, newSetting];
            }

            onColumnSortingChange(newSettings);
        },
        [props.columnSortSettings, onColumnSortingChange],
    );

    return (
        // TODO: Fix styling for sticky header. Border collapse doesn't play nice with it
        // Applying outline as a hack for the missing borders
        <thead className="select-none border-y-2 border-slate-400 shadow sticky top-0 [&_th]:outline [&_th]:outline-slate-300">
            {props.headerCellDefinitions.map((headerRow, index) => (
                <tr key={`header-row-depth${index}`} style={{ height: HEADER_HEIGHT_PX }}>
                    {headerRow.map((cellDef) => {
                        return (
                            <HeaderCell
                                key={cellDef.columnId}
                                alternatingColumnColors={props.alternatingColumnColors}
                                columnSortSettings={props.columnSortSettings}
                                onSortHeader={handleHeaderSort}
                                {...cellDef}
                            />
                        );
                    })}
                </tr>
            ))}

            {/* TODO: Clean up code, and let options define custom filters */}
            {hasFilters && (
                <tr className="bg-slate-200" style={{ height: HEADER_HEIGHT_PX }}>
                    {props.filterCellDefinitions.map((filterDef) => {
                        return (
                            <th key={filterDef.columnId} className="text-xs!">
                                <Input
                                    disabled={!filterDef.enabled}
                                    type="text"
                                    // value={filterValues[key] || ""}
                                    placeholder="Filter ..."
                                    // onChange={(e) => handleFilterChange(key, e.target.value)}
                                    endAdornment={
                                        <div
                                            className="cursor-pointer text-gray-600 hover:text-gray-500 text-sm"
                                            // onClick={() => handleFilterChange(key, "")}
                                        >
                                            <Close fontSize="inherit" />
                                        </div>
                                    }
                                    wrapperStyle={{
                                        fontWeight: "normal",
                                        fontSize: "0.25rem",
                                    }}
                                />
                            </th>
                        );
                    })}
                </tr>
            )}
        </thead>
    );
}
