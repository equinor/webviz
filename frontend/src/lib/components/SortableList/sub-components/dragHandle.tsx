import type React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type DragHandleProps = {
    className?: string;
    children?: React.ReactNode;
};

export function DragHandle(props: DragHandleProps) {
    return (
        <span
            data-sort-handle
            className={resolveClassNames("sortable-list-element-indicator hover:cursor-grab", props.className)}
        >
            {props.children}
        </span>
    );
}
