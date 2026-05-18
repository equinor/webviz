import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { useTableRootContext } from "../_contexts/tableRootContext";
import { useTableSectionContext } from "../_contexts/tableSectionContext";

export type TableRowProps = {
    rowKey?: string;
    children?: React.ReactNode;
};

function RowComponent(props: TableRowProps, ref: React.ForwardedRef<HTMLTableRowElement>): React.ReactNode {
    const rootContext = useTableRootContext();
    const sectionContext = useTableSectionContext();

    const isSelectable = rootContext.selectable && sectionContext === "body";
    const isActive = isSelectable && rootContext.selectedRow === props.rowKey;

    // TODO: Nicely allow text selection AND click select. See old table

    return (
        <tr
            ref={ref}
            className={resolveClassNames("border-neutral-subtle border-b", {
                "hover:bg-neutral-hover": isSelectable && !isActive,
                "bg-accent-strong text-accent-strong-on-emphasis": isActive,
                "hover:bg-accent-strong-hover hover:text-accent-strong-on-emphasis": isActive,
            })}
            onClick={() => {
                if (!isSelectable) return;
                if (!props.rowKey) return console.warn("Missing row identifier key");

                rootContext.onRowSelect?.(props.rowKey);
            }}
        >
            {props.children}
        </tr>
    );
}

export const Row = React.forwardRef<HTMLTableRowElement, TableRowProps>(RowComponent);
