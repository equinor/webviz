import React from "react";

import { composeRefs } from "../utils/composeRefs";

export type GroupProps = {
    id: string;
    children: React.ReactElement; // ✅ exactly one element
};

export const Group = React.forwardRef<HTMLElement, GroupProps>(function Group({ id, children }, externalRef) {
    const only = React.Children.only(children) as React.ReactElement;

    const mergedRef = composeRefs<HTMLElement>(externalRef as React.Ref<HTMLElement>, (only as any).ref);

    return React.cloneElement(only, {
        ref: mergedRef,
        "data-sortable": "group",
        "data-item-id": id,
    });
});
