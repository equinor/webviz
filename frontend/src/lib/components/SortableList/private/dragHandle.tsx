import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type DragHandleProps = {
    /** Additional class names applied to the drag handle span. */
    className?: string;
    /** Content inside the drag handle. */
    children: React.ReactNode;
};

export const DragHandle = React.forwardRef<HTMLSpanElement, DragHandleProps>(function DragHandle(props, ref): React.ReactNode {
    return (
        <span
            ref={ref}
            data-sort-handle
            className={resolveClassNames("sortable-list-element-indicator hover:cursor-grab", props.className)}
        >
            {props.children}
        </span>
    );
});
