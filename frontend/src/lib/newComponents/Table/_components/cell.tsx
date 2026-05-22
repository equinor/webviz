import React from "react";

import { ArrowDownward, ArrowUpward, Square } from "@mui/icons-material";
import { Key } from "ts-key-enum";

import type { ComponentWrapperProps } from "@lib/newComponents/_shared/wrapperProps";
import { resolveWrapperProps } from "@lib/newComponents/_shared/wrapperProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { useTableRootContext } from "../_contexts/tableRootContext";
import { useTableSectionContext } from "../_contexts/tableSectionContext";
import { getNextSortDirection } from "../_utils";
import { SortDirection } from "../typesAndEnums";

export type TableCellProps = {
    colKey?: string;
    children?: React.ReactNode;

    sortable?: boolean;

    // Don't understand why, but these don't get included by the native type, for some reason...
    colSpan?: number;
    rowSpan?: number;
} & ComponentWrapperProps<React.TableHTMLAttributes<HTMLTableCellElement>>;

function CellComponent(props: TableCellProps, ref: React.ForwardedRef<HTMLTableCellElement>): React.ReactNode {
    // const props = defaults({}, props, DEFAULT_PROPS);
    const baseProps = resolveWrapperProps(props, "colKey", "sortable");

    const sectionContext = useTableSectionContext();
    const rootContext = useTableRootContext();

    const CellTag = sectionContext === "body" ? "td" : "th";

    // Local prop takes precedence over root prop
    const isSortable = (props.sortable ?? rootContext.sortable) && sectionContext === "head";

    let currentSortDirection = SortDirection.NONE;
    if (isSortable && props.colKey && rootContext.currentSort && props.colKey in rootContext.currentSort) {
        currentSortDirection = rootContext.currentSort[props.colKey];
    }

    const isSorted = currentSortDirection !== SortDirection.NONE;

    function toggleSort() {
        if (!isSortable) return;
        if (!props.colKey) return console.warn("Missing column identifier key");

        rootContext.onColumnSort?.(props.colKey, getNextSortDirection(currentSortDirection));
    }

    return (
        <CellTag
            {...baseProps}
            ref={ref}
            tabIndex={isSortable ? 0 : undefined}
            role={isSortable ? "button" : undefined}
            className={resolveClassNames("px-horizontal-sm border-neutral-subtle text-left whitespace-nowrap", {
                "border-b": sectionContext === "body",
                "border-b-2": sectionContext !== "body",
                "py-vertical-sm": !rootContext.compact,
                "py-vertical-2xs": rootContext.compact,
                "hover:bg-neutral-hover cursor-pointer select-none": isSortable,
                "border-accent! text-accent-subtle": isSorted,
            })}
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
            <div className="flex items-center">
                {props.children}
                {isSortable && <SortingIcon direction={currentSortDirection} />}
            </div>
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
