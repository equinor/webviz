import React from "react";

import { ArrowDownward, ArrowUpward, Square } from "@mui/icons-material";
import { defaults } from "lodash-es";
import { Key } from "ts-key-enum";

import { useComponentSize } from "@lib/components/_shared/contexts/componentSizeContext";
import { resolveWrapperProps } from "@lib/components/_shared/utils/wrapperProps";
import { Separator } from "@lib/components/Separator";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { useTableCellColumnContext } from "../_contexts/tableCellColumnContext";
import { useTableRootContext } from "../_contexts/tableRootContext";
import { useTableSectionContext } from "../_contexts/tableSectionContext";
import { getNextSortDirection } from "../_utils";
import { ROW_HEIGHT_PX, ROW_HEIGHT_PX_COMPACT } from "../constants";
import { SortDirection } from "../typesAndEnums";

import type { TableCellProps } from "./types";

export const Cell = React.forwardRef<HTMLTableCellElement, TableCellProps>(function Cell(props, ref): React.ReactNode {
    const sectionContext = useTableSectionContext();
    const rootContext = useTableRootContext();
    const componentSize = useComponentSize();
    const leafColumn = useTableCellColumnContext();

    // Explicit cell props win over the column definitions
    const cellProps = defaults({}, props, leafColumn?.cellProps);

    const baseProps = resolveWrapperProps(cellProps, "colKey", "sortable", "widthInPercent", "noPadding");

    const CellTag = sectionContext === "body" ? "td" : "th";

    // Local prop takes precedence over root prop
    const isSortable = (cellProps.sortable ?? rootContext.sortable) && sectionContext === "head";

    const isPinned = Boolean(leafColumn?.isPinned);
    const pinOffset = leafColumn?.pinLeftOffset ?? 0;

    let currentSortDirection = SortDirection.NONE;
    let sortingIndex = -1;
    if (isSortable && cellProps.colKey && rootContext.columnSort) {
        const idx = rootContext.columnSort.findIndex(({ columnKey }) => columnKey === cellProps.colKey);

        currentSortDirection = rootContext.columnSort[idx]?.direction ?? SortDirection.NONE;
        sortingIndex = rootContext.columnSort.length > 1 ? idx : -1;
    }

    const isMultiSort = rootContext.sortable === "multiple";
    const isSorted = currentSortDirection !== SortDirection.NONE;
    const percentWidth = cellProps.widthInPercent ? `${cellProps.widthInPercent}%` : undefined;
    const activeCellWidth = cellProps.width ?? percentWidth;

    const cellHeightPx = rootContext.compact ? ROW_HEIGHT_PX_COMPACT[componentSize] : ROW_HEIGHT_PX[componentSize];

    function toggleSort(additive: boolean) {
        if (!isSortable) return;
        if (!cellProps.colKey) return console.warn("Missing column identifier key");

        rootContext.onColumnSort(cellProps.colKey, getNextSortDirection(currentSortDirection), additive);
    }

    return (
        <CellTag
            {...baseProps}
            data-pinned={isPinned ? "" : undefined}
            ref={ref}
            width={activeCellWidth}
            tabIndex={isSortable ? 0 : undefined}
            role={isSortable ? "button" : undefined}
            style={{
                fontWeight: "inherit",
                height: `${cellHeightPx}px`,
                left: isPinned ? pinOffset : undefined,
                ...baseProps.style,
            }}
            className={resolveClassNames(
                baseProps.className,
                "border-neutral-subtle group/cell text-left align-middle whitespace-nowrap",
                {
                    relative: !isPinned,
                    "sticky z-1": isPinned,
                    "bg-neutral-canvas": isPinned && sectionContext !== "body",
                    "bg-surface group-hover/row:bg-neutral-hover group-data-selected/row:bg-accent group-data-selected/row:group-hover/row:bg-accent-hover":
                        isPinned && sectionContext === "body",
                    "truncate overflow-hidden": rootContext.fixed,
                    "border-b": sectionContext === "body",
                    "border-b-2": sectionContext !== "body",
                    "px-sm": !cellProps.noPadding,
                    "py-sm": !rootContext.compact && !cellProps.noPadding,
                    "py-2xs": rootContext.compact && !cellProps.noPadding,
                    "hover:bg-neutral-hover cursor-pointer select-none": isSortable,
                    "border-accent! text-accent-subtle": isSorted,

                    // Give the *last* pinned column a clear border, and hide the
                    // Using pure CSS styling selectors so we don't need to bother computing what
                    // pinned cols are last during table setup
                    "border-r-2 [&:has(+&)]:border-r-0": isPinned,
                    "[&:has(+&)>.--separator]:visible [&>.--separator]:invisible": isPinned,
                },
            )}
            onClick={(evt) => {
                toggleSort(evt.shiftKey);
                cellProps.onClick?.(evt);
            }}
            onKeyDown={(evt) => {
                if (!isSortable) return;
                if (![Key.Enter, " "].includes(evt.key)) return;

                evt.preventDefault();

                toggleSort(evt.shiftKey);
                cellProps.onKeyDown?.(evt);
            }}
        >
            {cellProps.children}

            {isSortable && <SortingIcon direction={currentSortDirection} />}
            {isSortable && isMultiSort && (
                // Alway mounted to avoid layout shifts
                <span
                    data-single-sort={sortingIndex === -1 ? "" : undefined}
                    className="bg-accent-strong text-accent-strong-on-emphasis text-body-xs z-elevated px-horizontal-2xs -my-horizontal-2xs box-border inline-flex aspect-square h-4 w-fit min-w-4 items-center justify-center rounded leading-none whitespace-nowrap data-single-sort:invisible"
                >
                    {sortingIndex + 1}
                </span>
            )}
            {sectionContext !== "body" && (
                <Separator
                    orientation="vertical"
                    layoutClassName="--separator absolute inset-y-1/3 right-0 mx-0! group-last/cell:invisible"
                />
            )}
        </CellTag>
    );
});

function SortingIcon(props: { direction: SortDirection }): React.ReactNode {
    switch (props.direction) {
        case SortDirection.NONE:
            // ! We add an invisible icon to keep spacing consistent as you toggle
            return <Square fontSize="inherit" className="ml-4xs invisible" />;
        case SortDirection.ASC:
            return <ArrowUpward fontSize="inherit" className="ml-4xs" />;
        case SortDirection.DESC:
            return <ArrowDownward fontSize="inherit" className="ml-4xs" />;
    }
}
