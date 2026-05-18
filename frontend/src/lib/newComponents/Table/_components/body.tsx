import React from "react";

import { TableRootContext } from "../_contexts/tableRootContext";
import { TableSectionContext } from "../_contexts/tableSectionContext";

export type TableBodyProps = {
    children?: React.ReactNode;
};

export function BodyComponent(
    props: TableBodyProps,
    ref: React.ForwardedRef<HTMLTableSectionElement>,
): React.ReactNode {
    const rootContext = React.useContext(TableRootContext);

    return (
        <tbody ref={ref} tabIndex={rootContext?.selectable ? 0 : undefined}>
            <TableSectionContext.Provider value="body">{props.children}</TableSectionContext.Provider>
        </tbody>
    );
}

export const Body = React.forwardRef<HTMLTableSectionElement, TableBodyProps>(BodyComponent);
