import React from "react";

import { useComposedRefs } from "../utils/useComposedRefs";

export type SortableListGroupContentProps = {
    children: React.ReactElement;
};

export const GroupContent = React.forwardRef<HTMLElement, SortableListGroupContentProps>(
    function GroupContent(props, forwardedRef) {
        const onlyChild = React.Children.only(props.children) as React.ReactElement;

        const mergedRef = useComposedRefs<HTMLElement>(forwardedRef as React.Ref<HTMLElement>, (onlyChild as any).ref);

        return React.cloneElement(onlyChild, {
            ref: mergedRef,
            "data-sortable-list-group-content": "",
        });
    },
);
