import React from "react";
import { SortableListConfigContext } from "./sortableListContext";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { isEqual } from "lodash";
import { SortableListContext } from "./sortableList";
import { createPortal } from "@lib/utils/createPortal";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";

export type SortableItemProps = { id: string; children?: React.ReactNode };

export function SortableItem({ id, children }: SortableItemProps) {
    const { itemElement } = React.useContext(SortableListConfigContext);
    const sortableListContext = React.useContext(SortableListContext);
    const divRef = React.useRef<HTMLDivElement>(null);

    const RefTag = itemElement;

    const isHovered = sortableListContext.hoveredElementId === id;
    const isDragging = sortableListContext.draggedElementId === id;
    const dragPosition = sortableListContext.dragPosition;

    console.debug(dragPosition);

    const boundingClientRect = useElementBoundingRect(divRef);

    // NOTE: we don’t impose a header; dev should include an element with .sortable-list-item-header if needed
    return (
        <RefTag
            data-sortable="item"
            data-item-id={id}
            className={resolveClassNames("sortable-list-element sortable-list-item")}
        >
            {children}
            {isDragging &&
                dragPosition &&
                createPortal(
                    <div
                        className={resolveClassNames(
                            "flex h-8 bg-blue-50 text-sm items-center gap-1 border-b border-b-gray-300 absolute z-50 opacity-75",
                        )}
                        style={{
                            left: dragPosition.x,
                            top: dragPosition.y,
                            width: 200,
                        }}
                    ></div>,
                )}
        </RefTag>
    );
}

export type SortableGroupProps = {
    id: string;
    expanded?: boolean;
    children?: React.ReactNode; // dev content goes inside the group content
};

export function SortableGroup({ id, expanded, children }: SortableGroupProps) {
    const { itemElement } = React.useContext(SortableListConfigContext);
    const RefTag = itemElement;

    const [isExpanded, setIsExpanded] = React.useState(expanded ?? true);
    const [prevExpanded, setPrevExpanded] = React.useState(expanded);
    if (!isEqual(expanded, prevExpanded)) {
        if (expanded !== undefined) setIsExpanded(expanded);
        setPrevExpanded(expanded);
    }

    return (
        <RefTag
            data-sortable="group"
            data-item-id={id}
            className={resolveClassNames("sortable-list-element sortable-list-group")}
        >
            {/* dev’s header must include an element with .sortable-list-item-header and a <DragHandle /> somewhere */}
            <div className={resolveClassNames("sortable-list-group-content", { hidden: !isExpanded })}>{children}</div>
        </RefTag>
    );
}
