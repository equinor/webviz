import React from "react";

import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { SortableListContext } from "../sortableList";


export function useMakeDragGhostElement(
    id: string,
    element: React.ReactElement,
    ref: React.MutableRefObject<HTMLElement | null>
): React.ReactElement | null {
    const context = React.useContext(SortableListContext);
    const boundingClientRect = useElementBoundingRect(ref);
    const isDragging = context.draggedElementId === id;

    if (!isDragging || !context.dragPosition) {
        return null;
    }

    const isTr = String(element.type).toLowerCase() === "tr";

    const baseStyle: React.CSSProperties = {
        inset: 0,
        position: "absolute",
        transform: `translate3d(${context.dragPosition.x}px, ${context.dragPosition.y}px, 0)`,
        width: boundingClientRect.width,
        height: boundingClientRect.height,
        pointerEvents: "none",
        opacity: 0.85,
    };

    if (!isTr) {
        return React.cloneElement(element, {
            className: resolveClassNames(element.props.className),
            style: {
                ...element.props.style,
                ...baseStyle,
            },
        });
    } else {
        const rowClone = React.cloneElement(element, {
            className: resolveClassNames(element.props.className, "shadow-sm"),
            style: { ...(element.props.style || {}) },
        });

        return (
            <div style={baseStyle} className="bg-transparent">
                <table className="table-fixed border-collapse w-[inherit]">
                    <tbody>{rowClone}</tbody>
                </table>
            </div>
        );
    }
}
