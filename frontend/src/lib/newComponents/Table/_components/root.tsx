import React from "react";

import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/wrapperProps";
import { Typography } from "@lib/newComponents/Typography";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { TableColumnContextType } from "../_contexts/tableColumnContext";
import { TableColumnContext } from "../_contexts/tableColumnContext";
import { TableRootContext } from "../_contexts/tableRootContext";
import type { ColumnMetaData, SortDirection } from "../typesAndEnums";

import { Body } from "./body";
import { Column } from "./column";
import { Foot } from "./foot";
import { Head } from "./head";

export type TableRootProps = {
    sortable?: boolean;
    selectable?: boolean;
    children?: React.ReactNode;
    size?: "sm" | "md" | "lg";
    compact?: boolean;
    sortedColumns: [];
    currentSort?: { [colKey: string]: SortDirection };
    selectedRow?: string | null;
    // headRef: React.MutableRefObject
    onRowSelect?: (rowKey: string) => void;
    onChangeSortDirection?: (colKey: string, newDirection: SortDirection) => void;
} & ComponentWrapperProps<React.HTMLAttributes<HTMLTableElement>>;

function RootComponent(props: TableRootProps, ref: React.ForwardedRef<HTMLTableElement>): React.ReactNode {
    const { layoutClassName, ...otherProps } = props;
    const baseProps = resolveWrapperProps(
        otherProps,
        "sortable",
        "selectable",
        "size",
        "children",
        "compact",
        "sortedColumns",
        "currentSort",
        "selectedRow",
        "onRowSelect",
        "onChangeSortDirection",
    );

    const sizeOrDefault = props.size ?? "md";

    const headChild = React.Children.toArray(props.children).find((c) => React.isValidElement(c) && c.type === Head);
    // const bodyChild = React.Children.toArray(props.children).find((c) => React.isValidElement(c) && c.type === Body);
    // const footChild = React.Children.toArray(props.children).find((c) => React.isValidElement(c) && c.type === Foot);

    let headColumnMetaData: TableColumnContextType = {
        columns: [],
        content: null,
        maxDepth: 0,
        leafCount: 0,
    };

    if (headChild) {
        headColumnMetaData = recursivelyProcessColumnChildren(headChild);
    }

    return (
        <div className={resolveClassNames("relative overflow-auto", layoutClassName)}>
            <Typography
                {...baseProps}
                className="w-full border-separate border-spacing-[0]"
                as="table"
                ref={ref}
                family="body"
                size={sizeOrDefault}
            >
                <TableRootContext.Provider
                    value={{
                        size: sizeOrDefault,
                        sortable: props.sortable,
                        compact: props.compact,
                        selectable: props.selectable,
                        currentSort: props.currentSort,
                        selectedRow: props.selectedRow,
                        onRowSelect: props.onRowSelect,
                        onColumnSort: props.onChangeSortDirection,
                    }}
                >
                    <TableColumnContext.Provider value={headColumnMetaData}>
                        {/* {headChild}
                        {bodyChild}
                        {footChild} */}
                        {props.children}
                    </TableColumnContext.Provider>
                </TableRootContext.Provider>
            </Typography>
        </div>
    );
}

function recursivelyProcessColumnChildren(columnParent: React.ReactNode, depth = -1): ColumnMetaData {
    if (depth > 100) throw new Error("Maximum column depth exceeded. Check for circular references");
    if (!React.isValidElement(columnParent)) throw new Error("Expected a valid React element as column parent");

    const { children: colChildren, ...cellProps } = columnParent.props ?? {};

    const headerContent: React.ReactNode[] = [];
    const columns: ColumnMetaData[] = [];
    let leafCount = 0;
    let maxDepth = depth;

    React.Children.forEach(colChildren, (child) => {
        if (!child || !React.isValidElement(child) || child.type !== Column) {
            headerContent.push(child);
        } else {
            const childColumn = recursivelyProcessColumnChildren(child, depth + 1);

            leafCount += childColumn.leafCount;
            maxDepth = Math.max(maxDepth, childColumn.maxDepth);

            columns.push(childColumn);
        }
    });

    if (!columns.length) leafCount = 1;

    return {
        columns: columns,
        depth: depth,
        maxDepth: maxDepth,
        leafCount: leafCount,
        content: headerContent,
        cellProps: cellProps,
    };
}

export const Root = React.forwardRef<HTMLTableElement, TableRootProps>(RootComponent);
