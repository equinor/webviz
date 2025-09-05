import React from "react";

import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { createPortal } from "@lib/utils/createPortal";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { HoveredArea, SortableListContext } from "../sortableList";
import { composeRefs } from "../utils/composeRefs";

export type ItemProps = {
    id: string;
    children: React.ReactElement;
};

export const Item = React.forwardRef<HTMLElement, ItemProps>(function Item({ id, children }, externalRef) {
    const only = React.Children.only(children) as React.ReactElement;

    const localRef = React.useRef<HTMLElement | null>(null);
    const mergedRef = composeRefs<HTMLElement>(
        externalRef as React.Ref<HTMLElement>,
        (el) => {
            localRef.current = el;
        },
        (only as any).ref,
    );
    const boundingClientRect = useElementBoundingRect(localRef);

    const context = React.useContext(SortableListContext);
    const isDragging = context.draggedElementId === id;
    const isDropping = context.hoveredElementId === id;

    let className = only.props.className;
    if (isDragging) {
        className = resolveClassNames(
            className,
            "relative bg-blue-500 [&>td]:invisible [&>th]:invisible after:content-[''] after:absolute after:inset-0 after:bg-blue-500 after:z-10 after:pointer-events-none",
        );
    }

    if (isDropping) {
        className = resolveClassNames(
            className,
            "relative after:content-[''] after:absolute after:left-0 after:h-1 after:w-full after:bg-blue-600 after:z-10 after:pointer-events-none",
        );
        if (context.hoveredArea === HoveredArea.TOP) {
            className = resolveClassNames(className, "after:-top-0.5");
        }
        if (context.hoveredArea === HoveredArea.BOTTOM) {
            className = resolveClassNames(className, "after:-bottom-0.5");
        }
    }

    let dragGhostElement = null;
    if (isDragging && context.dragPosition) {
        const isTr = String(only.type).toLowerCase() === "tr";

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
            dragGhostElement = React.cloneElement(only, {
                className: resolveClassNames(only.props.className),
                style: {
                    ...only.props.style,
                    ...baseStyle,
                },
            });
        } else {
            const rowClone = React.cloneElement(only, {
                className: resolveClassNames(only.props.className, "shadow-sm"),
                style: { ...(only.props.style || {}) },
            });

            dragGhostElement = (
                <div style={baseStyle} className="bg-transparent">
                    <table className="table-fixed border-collapse w-[inherit]">
                        <tbody>{rowClone}</tbody>
                    </table>
                </div>
            );
        }
    }

    return (
        <>
            {React.cloneElement(only, {
                ref: mergedRef,
                "data-sortable": "item",
                "data-item-id": id,
                className,
            })}
            {createPortal(dragGhostElement)}
        </>
    );
});
