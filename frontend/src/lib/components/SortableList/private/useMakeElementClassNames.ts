import React from "react";

import { SortableListContext } from "../sortableList";

export function useMakeElementClassName(id: string): string {
    const context = React.useContext(SortableListContext);

    const isDragging = context.draggedElementId === id;

    return "";

    if (isDragging) {
        return "relative bg-blue-500 [&>td]:invisible [&>th]:invisible after:content-[''] after:absolute after:inset-0 after:bg-blue-500 after:z-10 after:pointer-events-none";
    }

    return "";
}
