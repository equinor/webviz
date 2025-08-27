import React from "react";

import { Virtualization } from "@lib/components/Virtualization";

import { ROW_HEIGHT_PX } from "../constants";
import type { TableDataWithKey, TableCellDefinitions, LoadedDataWithKey } from "../types";

import { TableRow } from "./tableRow";

type TableBodyProps<T extends Record<string, any>> = {
    rows: TableDataWithKey<T>[];
    rowHeight: number;
    wrapperElement: React.RefObject<HTMLElement>;
    height?: number | string;
    dataCellDefinitions: TableCellDefinitions<T>["dataCells"];
    selectedRows?: string[];
    selectable?: boolean;
    multiSelect?: boolean;
    onSelectedRowsChange?: (newSelection: string[]) => void;
    onRowClick?: (id: string, entry: LoadedDataWithKey<T>) => void;
    onRowHover?: (id: string | null, entry: LoadedDataWithKey<T> | null) => void;
    onVisibleRowRangeChange?: (startIndex: number, endIndex: number) => void;
};
export function TableBody<T extends Record<string, any>>(props: TableBodyProps<T>): React.ReactNode {
    const { onSelectedRowsChange, onRowClick, onRowHover } = props;

    const selectAnchorIndexRef = React.useRef(-1);

    const handleRowClick = React.useCallback(
        function handleRowClick(entry: LoadedDataWithKey<T>, rowIndex: number, evt: React.MouseEvent) {
            onRowClick?.(entry._key, entry);

            if (!props.selectable) return;
            // Don't do selection if user marked text
            if (!window.getSelection()?.isCollapsed) return;

            // Shift-click is a special case where we want to select each row between the previous and the newly clicked one
            if (props.multiSelect && evt.shiftKey && selectAnchorIndexRef.current !== -1) {
                const rangeStart = Math.min(selectAnchorIndexRef.current, rowIndex);
                const rangeEnd = Math.max(selectAnchorIndexRef.current, rowIndex);

                const selectionsInRange = props.rows.slice(rangeStart, rangeEnd + 1).map((r) => r._key);

                onSelectedRowsChange?.(selectionsInRange);
            } else {
                selectAnchorIndexRef.current = rowIndex;

                const isMultiSelect = props.multiSelect && evt.ctrlKey;
                const previousSelection = props.selectedRows ?? [];
                const alreadySelected = previousSelection.includes(entry._key);

                let newSelection = [] as string[];

                // Select/deselect logic
                if (isMultiSelect && alreadySelected) {
                    // Multi-select: Remove the row
                    newSelection = previousSelection.filter((k) => k !== entry._key);
                } else if (isMultiSelect) {
                    // Multi-select: Add the row
                    newSelection = [...previousSelection, entry._key];
                } else if (previousSelection.length > 1) {
                    // Single-select: Going from multi-select to single, we always select the clickedd row
                    newSelection = [entry._key];
                } else {
                    // Single-select: Toggle select/unselect for a one item
                    newSelection = alreadySelected ? [] : [entry._key];
                }

                // Everything got deselected, so we no longer have an "anchored" item, for range
                if (!newSelection.length) {
                    selectAnchorIndexRef.current = -1;
                }

                onSelectedRowsChange?.(newSelection);
            }
        },
        [onRowClick, onSelectedRowsChange, props.multiSelect, props.rows, props.selectable, props.selectedRows],
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
                itemSize={props.rowHeight}
                onScroll={props.onVisibleRowRangeChange}
                renderItem={(row, rowIndex) => (
                    <TableRow
                        key={row._key}
                        row={row}
                        selectionEnabled={props.selectable}
                        height={props.rowHeight}
                        dataCellDefinitions={props.dataCellDefinitions}
                        selected={!!props.selectedRows?.includes(row._key)}
                        onMouseOver={handleRowMouseOver}
                        onClick={(entry, evt) => handleRowClick(entry, rowIndex, evt)}
                    />
                )}
            />

            {props.rows.length === 0 && (
                // This one doesn't need to follow the custom height prop
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
