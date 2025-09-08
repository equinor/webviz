import { composeRefs } from "../utils/composeRefs";
import React from "react";

export type SortableListGroupContentProps = {
    children: React.ReactElement;
};

export const SortableListGroupContent = React.forwardRef<HTMLElement, SortableListGroupContentProps>(
    function SortableListGroupContent(props, forwardedRef) {
        const onlyChild = React.Children.only(props.children) as React.ReactElement;

        const mergedRef = composeRefs<HTMLElement>(forwardedRef as React.Ref<HTMLElement>, (onlyChild as any).ref);

        // Inject the marker class while preserving existing className
        return React.cloneElement(onlyChild, {
            ref: mergedRef,
            "data-sortable-list-group-content": "",
        });
    }
);
