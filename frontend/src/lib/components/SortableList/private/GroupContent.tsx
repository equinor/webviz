import React from "react";
import { composeRefs } from "../utils/composeRefs";

export type SortableListGroupContentProps = {
    /** Exactly one element child that becomes the group’s content container. */
    children: React.ReactElement;
};

export const SortableListGroupContent = React.forwardRef<HTMLElement, SortableListGroupContentProps>(
    function SortableListGroupContent({ children }, forwardedRef) {
        // Enforce exactly one element child
        const only = React.Children.only(children) as React.ReactElement;

        const mergedRef = composeRefs<HTMLElement>(forwardedRef as React.Ref<HTMLElement>, (only as any).ref);

        // Inject the marker class while preserving existing className
        return React.cloneElement(only, {
            ref: mergedRef,
            "data-sortable-list-group-content": "",
        });
    },
);
