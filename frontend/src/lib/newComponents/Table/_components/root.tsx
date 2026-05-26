import React from "react";

import { ComponentSizeContext, useComponentSize } from "@lib/newComponents/_shared/componentSizeContext";
import type { SelectableSize } from "@lib/newComponents/_shared/size";
import { getTextSizeForSelectableSize } from "@lib/newComponents/_shared/size";
import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/wrapperProps";
import { Typography } from "@lib/newComponents/Typography";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { TableColumnContextType } from "../_contexts/tableColumnContext";
import { TableColumnContext } from "../_contexts/tableColumnContext";
import { TableRootContext } from "../_contexts/tableRootContext";
import { recursivelyFindHeadChild } from "../_utils";
import type { ColumnMetaData, SortDirection, TableSortState } from "../typesAndEnums";

import { Column } from "./column";

export type TableRootProps = {
    height?: number | string;
    maxHeight?: number | string;
    width?: number | string;
    overflowWrapperRef?: React.RefObject<HTMLDivElement>;
    sortable?: boolean;
    selectable?: boolean;
    children?: React.ReactNode;
    size?: SelectableSize;
    compact?: boolean;
    currentSort?: TableSortState;
    selectedRow?: string | null;
    fixed?: boolean;
    onRowSelect?: (rowKey: string) => void;
    onChangeSortDirection?: (colKey: string, newDirection: SortDirection) => void;
} & ComponentWrapperProps<React.HTMLAttributes<HTMLTableElement>>;

function RootComponent(props: TableRootProps, ref: React.ForwardedRef<HTMLTableElement>): React.ReactNode {
    const { layoutClassName, ...otherProps } = props;

    const size = useComponentSize(props);
    const baseProps = resolveWrapperProps(
        otherProps,
        "sortable",
        "selectable",
        "size",
        "children",
        "compact",
        "fixed",
        "currentSort",
        "selectedRow",
        "height",
        "maxHeight",
        "width",
        "onRowSelect",
        "onChangeSortDirection",
        "overflowWrapperRef",
    );

    let headColumnMetaData: TableColumnContextType = {
        columns: [],
        content: null,
        maxDepth: 0,
        leafCount: 0,
    };

    const headChild = recursivelyFindHeadChild(props.children);

    if (headChild) {
        headColumnMetaData = recursivelyProcessColumnChildren(headChild);
    }

    return (
        <div
            ref={props.overflowWrapperRef}
            className={resolveClassNames("relative overflow-auto", layoutClassName)}
            style={{
                height: props.height,
                maxHeight: props.maxHeight,
                width: props.width,
            }}
        >
            <Typography
                {...baseProps}
                className={resolveClassNames("w-full border-separate border-spacing-[0]", {
                    "table-fixed": props.fixed,
                })}
                as="table"
                ref={ref}
                family="body"
                size={getTextSizeForSelectableSize(size)}
            >
                <TableRootContext.Provider
                    value={{
                        sortable: props.sortable,
                        compact: props.compact,
                        selectable: props.selectable,
                        currentSort: props.currentSort,
                        selectedRow: props.selectedRow,
                        onRowSelect: props.onRowSelect,
                        onColumnSort: props.onChangeSortDirection,
                    }}
                >
                    <ComponentSizeContext.Provider value={size}>
                        <TableColumnContext.Provider value={headColumnMetaData}>
                            {props.children}
                        </TableColumnContext.Provider>
                    </ComponentSizeContext.Provider>
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
