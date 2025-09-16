import React from "react";

import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { SortableListContext } from "../sortableList";

export function useMakeDragGhostElement(
    id: string,
    element: React.ReactElement,
    ref: React.MutableRefObject<HTMLElement | null>,
): React.ReactElement | null {
    const context = React.useContext(SortableListContext);
    const boundingClientRect = useElementBoundingRect(ref);
    const isDragging = context.draggedElementId === id;

    if (!isDragging || !context.dragPosition) {
        return null;
    }

    const isTableRow = isElementTypeTr(element);

    const width = Math.round(boundingClientRect.width || ref.current?.offsetWidth || 0);
    const height = Math.round(boundingClientRect.height || ref.current?.offsetHeight || 0);

    const x = Math.round(context.dragPosition.x);
    const y = Math.round(context.dragPosition.y);

    const baseStyle: React.CSSProperties = {
        inset: 0,
        position: "absolute",
        transform: `translate3d(${x}px, ${y}px, 0)`,
        width,
        height,
        pointerEvents: "none",
        opacity: 0.85,
        zIndex: 50,
        willChange: "transform,width,height",
    };

    if (!isTableRow) {
        return React.cloneElement(element, {
            className: resolveClassNames(element.props.className, "shadow-sm"),
            "aria-hidden": true,
            style: {
                ...(element.props.style || {}),
                ...baseStyle,
            },
        });
    }

    const rowClone = React.cloneElement(element, {
        "aria-hidden": true,
        className: resolveClassNames(element.props.className, "shadow-sm"),
        style: { ...(element.props.style || {}) },
    });

    return (
        <div style={baseStyle} className="bg-transparent" aria-hidden>
            <table className="table-fixed border-collapse w-[inherit]">
                <tbody>{rowClone}</tbody>
            </table>
        </div>
    );
}

function isElementTypeTr(el: React.ReactElement): boolean {
    return typeof el.type === "string" && el.type.toLowerCase() === "tr";
}
