import React from "react";

import { HoveredArea, SortableListContext } from "../sortableList";
import { composeRefs } from "../utils/composeRefs";

export type ItemProps = {
    id: string;
    children: React.ReactElement;
    dropIndicator: React.ReactElement;
};

export const Item = React.forwardRef<HTMLElement, ItemProps>(function Item(
    { id, children, dropIndicator },
    externalRef,
) {
    const only = React.Children.only(children) as React.ReactElement;
    const context = React.useContext(SortableListContext);

    const isDragging = context.draggedElementId === id;
    const isHovered = context.hoveredElementId === id;
    const hoveredArea = context.hoveredArea;

    const mergedRef = composeRefs<HTMLElement>(externalRef as React.Ref<HTMLElement>, (only as any).ref);

    return (
        <>
            {isHovered && hoveredArea === HoveredArea.TOP && dropIndicator}
            {React.cloneElement(only, {
                ref: mergedRef,
                "data-sortable": "item",
                "data-item-id": id,
            })}
            {isHovered && hoveredArea === HoveredArea.BOTTOM && dropIndicator}
        </>
    );
});
