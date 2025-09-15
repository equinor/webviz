import React from "react";

import { composeRefs } from "../utils/composeRefs";

export type SortableListGroupContentProps = {
    children: React.ReactElement;
};

export const GroupContent = React.forwardRef<HTMLElement, SortableListGroupContentProps>(
    function GroupContent(props, forwardedRef) {
        const onlyChild = React.Children.only(props.children) as React.ReactElement;

        const mergedRef = composeRefs<HTMLElement>(forwardedRef as React.Ref<HTMLElement>, (onlyChild as any).ref);

        return React.cloneElement(onlyChild, {
            ref: mergedRef,
            "data-sortable-list-group-content": "",
        });
    },
);
