import React from "react";

import { useElementSize } from "@lib/hooks/useElementSize";
import { useOptInControlledValue } from "@lib/hooks/useOptInControlledValue";
import { ComponentSizeContext, useComponentSize } from "@lib/components/_shared/contexts/componentSizeContext";
import type { SelectableSize } from "@lib/components/_shared/utils/size";
import { getTextSizeForSelectableSize } from "@lib/components/_shared/utils/size";
import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/components/_shared/utils/wrapperProps";
import { Typography } from "@lib/components/Typography";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { TableColumnContextType } from "../_contexts/tableColumnContext";
import { TableColumnContext } from "../_contexts/tableColumnContext";
import { TableRootContext } from "../_contexts/tableRootContext";
import type { TableSortState } from "../typesAndEnums";
import { SortDirection } from "../typesAndEnums";

import { Body } from "./body";
import type { ColumnMetaData } from "./column";
import { Column } from "./column";
import { Foot } from "./foot";
import { Head } from "./head";

type BaseProps = ComponentWrapperProps<React.HTMLAttributes<HTMLTableElement>>;

type SortingProps =
    | {
          sortable?: boolean;
          columnSorting?: TableSortState | null;
          onChangeColumnSort?: (columnSort: TableSortState | null) => void;
      }
    | {
          sortable: "multiple";
          columnSorting?: TableSortState[];
          onChangeColumnSort?: (columnSort: TableSortState[]) => void;
      };
type SelectProps =
    | { selectable?: boolean; rowSelection?: null | string; onChangeRowSelection?: (selection: null | string) => void }
    | {
          selectable: "multiple";
          rowSelection?: string[];
          onChangeRowSelection?: (rowKey: string[]) => void;
      };

export type TableRootProps = {
    /** Height of the scroll container. Can be a number (pixels) or a CSS string. */
    height?: number | string;
    /** Maximum height of the scroll container. Can be a number (pixels) or a CSS string. */
    maxHeight?: number | string;
    /** Width of the scroll container. Can be a number (pixels) or a CSS string. */
    width?: number | string;
    /** Ref forwarded to the overflow scroll wrapper element. */
    overflowWrapperRef?: React.RefObject<HTMLDivElement>;
    /** The table's Head, Body, and Foot sections. */
    children?: React.ReactNode;
    /** Size of rows and text. @default "default" */
    size?: SelectableSize;
    /** When true, reduces vertical padding in cells. */
    compact?: boolean;
    /** When true, applies `table-fixed` layout so column widths are driven by the header. */
    fixed?: boolean;
} & SortingProps &
    SelectProps &
    BaseProps;

export const Root = React.forwardRef<HTMLTableElement, TableRootProps>(function Root(props, ref): React.ReactNode {
    const { sortable, selectable, onChangeColumnSort, onChangeRowSelection, ...otherProps } = props;

    const innerTableRef = React.useRef<HTMLTableElement>(null);
    const innerWrapperRef = React.useRef<HTMLDivElement>(null);
    React.useImperativeHandle(ref, () => innerTableRef.current!);
    React.useImperativeHandle(props.overflowWrapperRef, () => innerWrapperRef.current!);

    const wrapperSize = useElementSize(innerWrapperRef);

    const tableSortStateArray = React.useMemo(() => {
        if (Array.isArray(props.columnSorting)) return props.columnSorting;
        if (props.columnSorting) return [props.columnSorting];
        if (props.columnSorting === null) return [];
        return props.columnSorting;
    }, [props.columnSorting]);
    const handleInternalSortChange = React.useCallback(
        function handleInternalSortChange(newSort: TableSortState[]) {
            if (!sortable || !onChangeColumnSort) return;
            if (sortable === "multiple") return onChangeColumnSort(newSort);
            if (!newSort.length) return onChangeColumnSort(null);

            return onChangeColumnSort(newSort[0]);
        },
        [onChangeColumnSort, sortable],
    );

    const selectStateArray = React.useMemo(() => {
        if (Array.isArray(props.rowSelection)) return props.rowSelection;
        if (props.rowSelection != null) return [props.rowSelection];
        if (props.rowSelection === null) return [];
        return props.rowSelection;
    }, [props.rowSelection]);
    const handleInternalSelectChange = React.useCallback(
        function handleInternalSelectChange(newSelect: string[]) {
            if (!selectable || !onChangeRowSelection) return;
            if (selectable === "multiple") return onChangeRowSelection(newSelect);
            if (!newSelect.length) return onChangeRowSelection(null);

            return onChangeRowSelection(newSelect[0]);
        },
        [onChangeRowSelection, selectable],
    );

    const [columnSortState, setTableSortState] = useOptInControlledValue(
        [],
        tableSortStateArray,
        handleInternalSortChange,
    );
    const [rowSelectState, setSelectedRows] = useOptInControlledValue([], selectStateArray, handleInternalSelectChange);

    const size = useComponentSize(props);
    const baseProps = resolveWrapperProps(
        otherProps,
        "size",
        "children",
        "compact",
        "fixed",
        "columnSorting",
        "rowSelection",
        "height",
        "maxHeight",
        "width",
        "overflowWrapperRef",
    );
    const { className: wrapperClassName, style: wrapperStyle, ...tableBaseProps } = baseProps;

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

    const handleColumnSort = React.useCallback(
        function handleColumnSortFunc(columnKey: string, direction: SortDirection, additive: boolean) {
            const isRemoving = direction === SortDirection.NONE;
            let newSortState: TableSortState[] = [];

            if (additive && props.sortable === "multiple") {
                // If additive, we want to keep the existing sort state for other columns
                newSortState = [...columnSortState.filter((sort) => sort.columnKey !== columnKey)];
                if (!isRemoving) {
                    newSortState.push({ columnKey, direction });
                }
            } else {
                // If not additive, we want to replace the sort state with just the new column
                if (!isRemoving) {
                    newSortState = [{ columnKey, direction }];
                }
            }

            setTableSortState(newSortState);
        },
        [props.sortable, columnSortState, setTableSortState],
    );

    const handleRowSelect = React.useCallback(
        function handleRowSelectFunc(rowKey: string) {
            const isDeselecting = rowSelectState.includes(rowKey);
            let newSelectState: string[] = [];

            if (props.selectable === "multiple") {
                // If additive, we want to keep the existing selection for other rows
                newSelectState = [...rowSelectState.filter((key) => key !== rowKey)];
                if (!isDeselecting) {
                    newSelectState.push(rowKey);
                }
            } else {
                // If not additive, we want to replace the selection with just the new row
                if (!isDeselecting) {
                    newSelectState = [rowKey];
                }
            }

            setSelectedRows(newSelectState);
        },
        [props.selectable, rowSelectState, setSelectedRows],
    );

    return (
        <div
            ref={innerWrapperRef}
            className={resolveClassNames(wrapperClassName, "relative overflow-auto")}
            style={{
                ...wrapperStyle,
                height: props.height,
                maxHeight: props.maxHeight,
                width: props.width,
            }}
        >
            <Typography
                {...tableBaseProps}
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
                        overflowWrapperRef: innerWrapperRef,
                        availableBodyHeight: availableBodyHeight,
                        sortable: props.sortable,
                        fixed: props.fixed,
                        compact: props.compact,
                        selectable: props.selectable,
                        columnSort: columnSortState,
                        rowSelection: rowSelectState,
                        onColumnSort: handleColumnSort,
                        onRowSelect: handleRowSelect,
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
});

/** The table head component *might* be wrapped in virtual context components, so we need to recursively dig down for it */
export function recursivelyFindHeadChild(children: React.ReactNode): React.ReactElement | null {
    return doRecursivelyFindHeadChild(children);
}

function doRecursivelyFindHeadChild(children: React.ReactNode, depth = 0): React.ReactElement | null {
    if (depth > 100) throw new Error("Maximum table child depth exceeded. Check for circular references");

    for (const child of React.Children.toArray(children)) {
        if (!React.isValidElement(child)) continue;

        // Per html syntax, head cannot be in inside the footer or body, so we'll just skip them
        if (child.type === Foot) continue;
        if (child.type === Body) continue;
        if (child.type === Head) return child;

        if (child.props?.children) {
            // Recursively check element children
            return doRecursivelyFindHeadChild(child.props?.children, depth + 1);
        }
    }

    return null;
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
