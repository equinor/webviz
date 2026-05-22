import React from "react";

import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/wrapperProps";

import { TableRootContext } from "../_contexts/tableRootContext";
import { TableSectionContext } from "../_contexts/tableSectionContext";

export type TableBodyProps = {
    children?: React.ReactNode;
} & ComponentWrapperProps<React.HTMLAttributes<HTMLTableSectionElement>>;

export function BodyComponent(
    props: TableBodyProps,
    ref: React.ForwardedRef<HTMLTableSectionElement>,
): React.ReactNode {
    const baseProps = resolveWrapperProps(props);
    const rootContext = React.useContext(TableRootContext);

    return (
        <tbody {...baseProps} ref={ref} tabIndex={rootContext?.selectable ? 0 : undefined}>
            <TableSectionContext.Provider value="body">{props.children}</TableSectionContext.Provider>
        </tbody>
    );
}

export const Body = React.forwardRef<HTMLTableSectionElement, TableBodyProps>(BodyComponent);
