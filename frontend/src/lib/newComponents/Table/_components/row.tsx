import React from "react";

import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/wrapperProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { TableRootContext, useTableRootContext } from "../_contexts/tableRootContext";
import { useTableSectionContext } from "../_contexts/tableSectionContext";

export type TableRowProps = {
    sortable?: boolean;
    rowKey?: string;
    children?: React.ReactNode;
} & ComponentWrapperProps<React.TableHTMLAttributes<HTMLTableRowElement>>;

function RowComponent(props: TableRowProps, ref: React.ForwardedRef<HTMLTableRowElement>): React.ReactNode {
    const baseProps = resolveWrapperProps(props, "rowKey", "sortable");

    const rootContext = useTableRootContext();
    const sectionContext = useTableSectionContext();

    const isSelectable = rootContext.selectable && sectionContext === "body";
    const isSelected = isSelectable && rootContext.selectedRow === props.rowKey;

    // TODO: Nicely allow text selection AND click select. See old table

    return (
        <tr
            {...baseProps}
            ref={ref}
            className={resolveClassNames(props.layoutClassName, {
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

                rootContext.onRowSelect?.(props.rowKey);
                props?.onClick?.(evt);
            }}
        >
            <TableRootContext.Provider value={{ ...rootContext, sortable: props.sortable ?? rootContext.sortable }}>
                {props.children}
            </TableRootContext.Provider>
        </tr>
    );
}

export const Row = React.forwardRef<HTMLTableRowElement, TableRowProps>(RowComponent);
