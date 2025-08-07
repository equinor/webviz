import React from "react";

import { Virtualization } from "@lib/components/Virtualization";

import { ROW_HEIGHT_PX } from "../constants";
import type { TableDataWithKey, TableCellDefinitions, LoadedDataWithKey } from "../types";

import { TableRow } from "./tableRow";

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
    onVisibleRowRangeChange?: (startIndex: number, endIndex: number) => void;
};
export function TableBody<T extends Record<string, any>>(props: TableBodyProps<T>): React.ReactNode {
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
                onScroll={props.onVisibleRowRangeChange}
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
