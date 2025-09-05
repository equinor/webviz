import React from "react";

import { SortableListContext } from "../sortableList";

export function useMakeElementClassName(id: string): string {
    const context = React.useContext(SortableListContext);

    const isDragging = context.draggedElementId === id;
    const isDropping = context.hoveredElementId === id;

    if (isDragging) {
        return "relative bg-blue-500 [&>td]:invisible [&>th]:invisible after:content-[''] after:absolute after:inset-0 after:bg-blue-500 after:z-10 after:pointer-events-none";
    }

    /*

    if (isDropping) {
        let className = `relative after:content-[''] after:absolute after:left-0 after:h-1 after:w-full after:bg-blue-600 after:z-10 after:pointer-events-none`;

        if (context.hoveredArea === HoveredArea.TOP) {
            className = resolveClassNames(className, "after:-top-0.5");
        }
        if (context.hoveredArea === HoveredArea.BOTTOM) {
            className = resolveClassNames(className, "after:-bottom-0.5");
        }
        return className;
    }
        */

    return "";
}
