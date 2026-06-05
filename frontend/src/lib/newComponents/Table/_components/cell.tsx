import React from "react";

import { ArrowDownward, ArrowUpward, Square } from "@mui/icons-material";
import { Key } from "ts-key-enum";

import { useComponentSize } from "@lib/newComponents/_shared/contexts/componentSizeContext";
import type { ComponentWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";
import { resolveWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { useTableRootContext } from "../_contexts/tableRootContext";
import { useTableSectionContext } from "../_contexts/tableSectionContext";
import { getNextSortDirection } from "../_utils";
import { ROW_HEIGHT_PX, ROW_HEIGHT_PX_COMPACT } from "../constants";
import { SortDirection } from "../typesAndEnums";

export type TableCellProps = {
    colKey?: string;
    children?: React.ReactNode;

    sortable?: boolean;

    // Don't understand why, but these don't get included by the native type, for some reason...
    colSpan?: number;
    rowSpan?: number;
    noPadding?: boolean;
    widthInPercent?: number;
} & ComponentWrapperProps<React.TableHTMLAttributes<HTMLTableCellElement>>;

function CellComponent(props: TableCellProps, ref: React.ForwardedRef<HTMLTableCellElement>): React.ReactNode {
    const baseProps = resolveWrapperProps(props, "colKey", "sortable", "widthInPercent", "noPadding");

    const sectionContext = useTableSectionContext();
    const rootContext = useTableRootContext();
    const componentSize = useComponentSize();

    const CellTag = sectionContext === "body" ? "td" : "th";

    // Local prop takes precedence over root prop
    const isSortable = (props.sortable ?? rootContext.sortable) && sectionContext === "head";

    let currentSortDirection = SortDirection.NONE;
    if (isSortable && props.colKey && rootContext.currentSort && props.colKey in rootContext.currentSort) {
        currentSortDirection = rootContext.currentSort[props.colKey];
    }

    const isSorted = currentSortDirection !== SortDirection.NONE;
    const percentWidth = props.widthInPercent ? `${props.widthInPercent}%` : undefined;

    const cellHeightPx = rootContext.compact ? ROW_HEIGHT_PX_COMPACT[componentSize] : ROW_HEIGHT_PX[componentSize];

    function toggleSort() {
        if (!isSortable) return;
        if (!props.colKey) return console.warn("Missing column identifier key");

        rootContext.onColumnSort?.(props.colKey, getNextSortDirection(currentSortDirection));
    }

    return (
        <CellTag
            {...baseProps}
            ref={ref}
            width={props.width ?? percentWidth}
            tabIndex={isSortable ? 0 : undefined}
            role={isSortable ? "button" : undefined}
            style={{ fontWeight: "inherit", height: `${cellHeightPx}px` }}
            className={resolveClassNames(
                props.layoutClassName,
                "border-neutral-subtle text-left align-middle whitespace-nowrap",
                {
                    "truncate overflow-hidden": rootContext.fixed,
                    "border-b": sectionContext === "body",
                    "border-b-2": sectionContext !== "body",
                    "px-horizontal-sm": !props.noPadding,
                    "py-vertical-sm": !rootContext.compact && !props.noPadding,
                    "py-vertical-2xs": rootContext.compact && !props.noPadding,
                    "hover:bg-neutral-hover cursor-pointer select-none": isSortable,
                    "border-accent! text-accent-subtle": isSorted,
                },
            )}
            onClick={(evt) => {
                toggleSort();
                props.onClick?.(evt);
            }}
            onKeyDown={(evt) => {
                if (!isSortable) return;
                if (![Key.Enter, " "].includes(evt.key)) return;

                evt.preventDefault();

                toggleSort();
                props.onKeyDown?.(evt);
            }}
        >
            {props.children}
            {isSortable && <SortingIcon direction={currentSortDirection} />}
        </CellTag>
    );
}

export const Cell = React.forwardRef<HTMLTableCellElement, TableCellProps>(CellComponent);

function SortingIcon(props: { direction: SortDirection }): React.ReactNode {
    switch (props.direction) {
        case SortDirection.NONE:
            // ! We add an invisible icon to keep spacing consistent as you toggle
            return <Square fontSize="inherit" className="ml-vertical-4xs invisible" />;
        case SortDirection.ASC:
            return <ArrowUpward fontSize="inherit" className="ml-vertical-4xs" />;
        case SortDirection.DESC:
            return <ArrowDownward fontSize="inherit" className="ml-vertical-4xs" />;
    }
}
