import React from "react";

import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/components/_shared/utils/wrapperProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { TableCellColumnContext } from "../_contexts/tableCellColumnContext";
import { useTableColumnContext } from "../_contexts/tableColumnContext";
import { TableRootContext, useTableRootContext } from "../_contexts/tableRootContext";
import { useTableSectionContext } from "../_contexts/tableSectionContext";

import type { ColumnMetaData } from "./column";
import type { TableRootProps } from "./root";
import type { TableCellProps } from "./types";

export type TableRowProps = {
    /** When true, makes this row selectable, overriding the table-level `selectable` setting. */
    selectable?: boolean;
    /** Overrides the sortable behavior for columns within this row. */
    sortable?: TableRootProps["sortable"];
    /** Unique key identifying this row, required for row selection to work. */
    rowKey?: string;
    /**
     * Cells inherit column-level props (e.g. `stickyLeftPx`) from the leaf column at the same position. Set to
     * false for rows whose cells span several columns, such as the generated header rows. @default true
     */
    inheritColumnProps?: boolean;
    /** The table cells to render. */
    children?: React.ReactNode;
} & ComponentWrapperProps<React.TableHTMLAttributes<HTMLTableRowElement>>;

export const Row = React.forwardRef<HTMLTableRowElement, TableRowProps>(function Row(props, ref): React.ReactNode {
    const baseProps = resolveWrapperProps(props, "rowKey", "sortable", "selectable", "inheritColumnProps");

    const rootContext = useTableRootContext();
    const sectionContext = useTableSectionContext();
    const columnContext = useTableColumnContext();

    const isSelectable = (props.selectable ?? rootContext.selectable) && sectionContext === "body";
    const isSelected = !!props.rowKey && isSelectable && rootContext.rowSelection.includes(props.rowKey);

    const children =
        (props.inheritColumnProps ?? true)
            ? provideLeafColumns(props.children, columnContext.leafColumns)
            : props.children;

    // TODO: Nicely allow text selection AND click select. See old table

    return (
        <tr
            {...baseProps}
            ref={ref}
            data-selected={isSelected ? "" : undefined}
            className={resolveClassNames(baseProps.className, {
                // Pinned cells mirror the row's hover/selection background through this group
                "group/row": isSelectable,
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
                {children}
            </TableRootContext.Provider>
        </tr>
    );
});

/**
 * Gives each cell child the leaf column at its position, so `Cell` can inherit column-level props (e.g. sticky
 * offsets) without the consumer repeating them. Passed via context so wrapper components around `Cell` still work.
 */
function provideLeafColumns(children: React.ReactNode, leafColumns: ColumnMetaData[]): React.ReactNode {
    if (leafColumns.length === 0) return children;

    let cellIndex = 0;
    // eslint-disable-next-line @eslint-react/no-children-map -- Cells are matched to leaf columns by position
    return React.Children.map(children, (child) => {
        // Empty nodes render nothing, so they do not occupy a column
        if (child === null || child === undefined || typeof child === "boolean") return child;

        const leafColumn = leafColumns[cellIndex] ?? null;
        const colSpan = React.isValidElement<TableCellProps>(child) ? (child.props.colSpan ?? 1) : 1;
        cellIndex += colSpan;

        return <TableCellColumnContext.Provider value={leafColumn}>{child}</TableCellColumnContext.Provider>;
    });
}
