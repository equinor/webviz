import React from "react";

import { SortableListContext } from "../sortableList";
import { composeRefs } from "../utils/composeRefs";

export type ItemProps = {
    id: string;
    children: React.ReactElement;
};

export const Item = React.forwardRef<HTMLElement, ItemProps>(function Item({ id, children }, externalRef) {
    const only = React.Children.only(children) as React.ReactElement;
    const context = React.useContext(SortableListContext);

    const mergedRef = composeRefs<HTMLElement>(externalRef as React.Ref<HTMLElement>, (only as any).ref);

    return (
        <>
            {React.cloneElement(only, {
                ref: mergedRef,
                "data-sortable": "item",
                "data-item-id": id,
            })}
        </>
    );
});
