import React from "react";

import { useComponentSize } from "@lib/newComponents/_shared/contexts/componentSizeContext";
import { getNextTextSize, getTextSizeForSelectableSize } from "@lib/newComponents/_shared/utils/size";
import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";
import { Typography } from "@lib/newComponents/Typography";

import { Table } from "..";
import { useTableColumnContext } from "../_contexts/tableColumnContext";
import { useTableRootContext } from "../_contexts/tableRootContext";
import { TableSectionContext } from "../_contexts/tableSectionContext";

export type TableBodyProps = {
    emptyMessage?: string | false;
    children?: React.ReactNode;
} & ComponentWrapperProps<React.HTMLAttributes<HTMLTableSectionElement>>;

export function BodyComponent(
    props: TableBodyProps,
    ref: React.ForwardedRef<HTMLTableSectionElement>,
): React.ReactNode {
    const baseProps = resolveWrapperProps(props);
    const rootContext = useTableRootContext();

    return (
        <tbody {...baseProps} ref={ref} tabIndex={rootContext.selectable ? 0 : undefined}>
            <TableSectionContext.Provider value="body">{props.children}</TableSectionContext.Provider>
            <NoDataRow message={props.emptyMessage} />
        </tbody>
    );
}

function NoDataRow(props: { message?: string | false }) {
    const columnContext = useTableColumnContext();
    const size = useComponentSize();
    const textSize = getTextSizeForSelectableSize(size);

    if (props.message === false || props.message === "") return null;

    return (
        <Table.Row layoutClassName="not-only:hidden" selectable={false}>
            <Table.Cell colSpan={columnContext.leafCount}>
                <Typography italic layoutClassName="opacity-50" size={getNextTextSize(textSize, 1)}>
                    {props.message ?? "No data found"}
                </Typography>
            </Table.Cell>
        </Table.Row>
    );
}

export const Body = React.forwardRef<HTMLTableSectionElement, TableBodyProps>(BodyComponent);
