import React from "react";

import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/components/_shared/utils/wrapperProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { TableRootContext, useTableRootContext } from "../_contexts/tableRootContext";
import { useTableSectionContext } from "../_contexts/tableSectionContext";

import type { TableRootProps } from "./root";

export type TableRowProps = {
    /** When true, makes this row selectable, overriding the table-level `selectable` setting. */
    selectable?: boolean;
    /** Overrides the sortable behavior for columns within this row. */
    sortable?: TableRootProps["sortable"];
    /** Unique key identifying this row, required for row selection to work. */
    rowKey?: string;
    /** The table cells to render. */
    children?: React.ReactNode;
} & ComponentWrapperProps<React.TableHTMLAttributes<HTMLTableRowElement>>;

export const Row = React.forwardRef<HTMLTableRowElement, TableRowProps>(function Row(props, ref): React.ReactNode {
    const baseProps = resolveWrapperProps(props, "rowKey", "sortable", "selectable");

    const rootContext = useTableRootContext();
    const sectionContext = useTableSectionContext();

    const isSelectable = (props.selectable ?? rootContext.selectable) && sectionContext === "body";
    const isSelected = !!props.rowKey && isSelectable && rootContext.rowSelection.includes(props.rowKey);

    // TODO: Nicely allow text selection AND click select. See old table

    return (
        <tr
            {...baseProps}
            ref={ref}
            data-selected={isSelected ? "" : undefined}
            className={resolveClassNames(baseProps.className, {
                "font-normal": sectionContext === "body",
                "font-extrabold": sectionContext !== "body",
                "text-neutral-subtle": !isSelected,
                "hover:bg-neutral-hover": isSelectable && !isSelected,
                "bg-accent-strong text-accent-strong-on-emphasis!": isSelected,
                "hover:bg-accent-strong-hover hover:text-accent-strong-on-emphasis!": isSelected,
            })}
            onClick={(evt) => {
                if (!isSelectable) return;
                if (!props.rowKey) return console.warn("Missing row identifier key");

                rootContext.onRowSelect(props.rowKey);
                props?.onClick?.(evt);
            }}
        >
            <TableRootContext.Provider value={{ ...rootContext, sortable: props.sortable ?? rootContext.sortable }}>
                {props.children}
            </TableRootContext.Provider>
        </tr>
    );
});
