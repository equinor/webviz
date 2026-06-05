import React from "react";

import { useElementSize } from "@lib/hooks/useElementSize";
import { ComponentSizeContext, useComponentSize } from "@lib/newComponents/_shared/contexts/componentSizeContext";
import type { SelectableSize } from "@lib/newComponents/_shared/utils/size";
import { getTextSizeForSelectableSize } from "@lib/newComponents/_shared/utils/size";
import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";
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

    const innerTableRef = React.useRef<HTMLTableElement>(null);
    const innerWrapperRef = React.useRef<HTMLDivElement>(null);

    React.useImperativeHandle(ref, () => innerTableRef.current!);
    React.useImperativeHandle(props.overflowWrapperRef, () => innerWrapperRef.current!);

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

    const wrapperSize = useElementSize(innerWrapperRef);

    // Calculate available body height if the table was to fill the wrapper. This is used for the PendingRows "fill" option to automatically fill the remaining space in the table body.
    // ! This assumes that header and footer sizes are static, and only re-triggers if the wrapper size changes
    const availableBodyHeight = React.useMemo(() => {
        if (!innerWrapperRef.current || !innerTableRef.current) return 0;

        const wrapperHeight = wrapperSize.height;

        const tableElement = innerTableRef.current;

        const headerElement = tableElement.querySelector("thead");
        const footerElement = tableElement.querySelector("tfoot");

        // TODO: Do we actually use the "partial" fill anywhere?
        const existingRows = tableElement.querySelectorAll("tbody tr:not(.--pending-row)");
        const existingRowsHeight = Array.from(existingRows).reduce((sum, row) => sum + row.clientHeight, 0);

        const headerHeight = headerElement?.clientHeight ?? 0;
        const footerHeight = footerElement?.clientHeight ?? 0;

        const bodyHeight = wrapperHeight - headerHeight - footerHeight - existingRowsHeight;
        return Math.max(bodyHeight, 0);
    }, [wrapperSize.height]);

    return (
        <div
            ref={innerWrapperRef}
            className={resolveClassNames("relative overflow-auto", layoutClassName)}
            style={{
                height: props.height,
                maxHeight: props.maxHeight,
                width: props.width,
            }}
        >
            <Typography
                {...baseProps}
                layoutClassName={resolveClassNames("w-full border-separate border-spacing-[0]", {
                    "table-fixed": props.fixed,
                })}
                as="table"
                ref={innerTableRef}
                family="body"
                size={getTextSizeForSelectableSize(size)}
            >
                <TableRootContext.Provider
                    value={{
                        availableBodyHeight: availableBodyHeight,
                        sortable: props.sortable,
                        fixed: props.fixed,
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
