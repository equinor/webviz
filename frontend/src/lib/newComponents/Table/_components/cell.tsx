import React from "react";

import { ArrowDownward, ArrowUpward, Square } from "@mui/icons-material";
import { Key } from "ts-key-enum";

import { useComponentSize } from "@lib/newComponents/_shared/contexts/componentSizeContext";
import { resolveWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";
import { Separator } from "@lib/newComponents/Separator";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { useTableRootContext } from "../_contexts/tableRootContext";
import { useTableSectionContext } from "../_contexts/tableSectionContext";
import { getNextSortDirection } from "../_utils";
import { ROW_HEIGHT_PX, ROW_HEIGHT_PX_COMPACT } from "../constants";
import { SortDirection } from "../typesAndEnums";

import type { TableCellProps } from "./types";

export const Cell = React.forwardRef<HTMLTableCellElement, TableCellProps>(function Cell(props, ref): React.ReactNode {
    const baseProps = resolveWrapperProps(props, "colKey", "sortable", "widthInPercent", "noPadding");

    const sectionContext = useTableSectionContext();
    const rootContext = useTableRootContext();
    const componentSize = useComponentSize();

    const CellTag = sectionContext === "body" ? "td" : "th";

    // Local prop takes precedence over root prop
    const isSortable = (props.sortable ?? rootContext.sortable) && sectionContext === "head";

    let currentSortDirection = SortDirection.NONE;
    let sortingIndex = -1;
    if (isSortable && props.colKey && rootContext.columnSort) {
        const idx = rootContext.columnSort.findIndex(({ columnKey }) => columnKey === props.colKey);

        currentSortDirection = rootContext.columnSort[idx]?.direction ?? SortDirection.NONE;
        sortingIndex = rootContext.columnSort.length > 1 ? idx : -1;
    }

    const isMultiSort = rootContext.sortable === "multiple";
    const isSorted = currentSortDirection !== SortDirection.NONE;
    const percentWidth = props.widthInPercent ? `${props.widthInPercent}%` : undefined;
    const activeCellWidth = props.width ?? percentWidth;

    const cellHeightPx = rootContext.compact ? ROW_HEIGHT_PX_COMPACT[componentSize] : ROW_HEIGHT_PX[componentSize];

    function toggleSort(additive: boolean) {
        if (!isSortable) return;
        if (!props.colKey) return console.warn("Missing column identifier key");

        rootContext.onColumnSort(props.colKey, getNextSortDirection(currentSortDirection), additive);
    }

    return (
        <CellTag
            {...baseProps}
            ref={ref}
            width={activeCellWidth}
            tabIndex={isSortable ? 0 : undefined}
            role={isSortable ? "button" : undefined}
            style={{ fontWeight: "inherit", height: `${cellHeightPx}px`, ...baseProps.style }}
            className={resolveClassNames(
                baseProps.className,
                "border-neutral-subtle group/cell relative text-left align-middle whitespace-nowrap",
                {
                    "truncate overflow-hidden": rootContext.fixed,
                    "border-b": sectionContext === "body",
                    "border-b-2": sectionContext !== "body",
                    "px-sm": !props.noPadding,
                    "py-sm": !rootContext.compact && !props.noPadding,
                    "py-2xs": rootContext.compact && !props.noPadding,
                    "hover:bg-neutral-hover cursor-pointer select-none": isSortable,
                    "border-accent! text-accent-subtle": isSorted,
                },
            )}
            onClick={(evt) => {
                toggleSort(evt.shiftKey);
                props.onClick?.(evt);
            }}
            onKeyDown={(evt) => {
                if (!isSortable) return;
                if (![Key.Enter, " "].includes(evt.key)) return;

                evt.preventDefault();

                toggleSort(evt.shiftKey);
                props.onKeyDown?.(evt);
            }}
        >
            {props.children}

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
                    layoutClassName="absolute inset-y-1/3 right-0 mx-0! group-last/cell:invisible"
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
