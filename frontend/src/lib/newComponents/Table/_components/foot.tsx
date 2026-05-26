import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { TableSectionContext } from "../_contexts/tableSectionContext";

export type TableFootProps = {
    sticky?: boolean;
    children?: React.ReactNode;
};

function FootComponent(props: TableFootProps, ref: React.ForwardedRef<HTMLTableSectionElement>): React.ReactNode {
    return (
        <TableSectionContext.Provider value="foot">
            <tfoot
                ref={ref}
                className={resolveClassNames("bg-input text-neutral-strong border-neutral-subtle border-b-2", {
                    "z-elevated sticky bottom-0": props.sticky,
                })}
            >
                {props.children}
            </tfoot>
        </TableSectionContext.Provider>
    );
}

export const Foot = React.forwardRef<HTMLTableSectionElement, TableFootProps>(FootComponent);
