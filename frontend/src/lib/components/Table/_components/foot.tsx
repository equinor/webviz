import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { TableSectionContext } from "../_contexts/tableSectionContext";

export type TableFootProps = {
    /** When true, the footer row sticks to the bottom of the scroll container. @default false */
    sticky?: boolean;
    /** The footer row content. */
    children?: React.ReactNode;
};

export const Foot = React.forwardRef<HTMLTableSectionElement, TableFootProps>(function Foot(props, ref): React.ReactNode {
    return (
        <TableSectionContext.Provider value="foot">
            <tfoot
                ref={ref}
                className={resolveClassNames("bg-input text-neutral-strong border-neutral-subtle", {
                    "z-elevated sticky bottom-0": props.sticky,
                })}
            >
                {props.children}
            </tfoot>
        </TableSectionContext.Provider>
    );
});
