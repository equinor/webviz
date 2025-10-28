import { MANHATTAN_LENGTH } from "@lib/utils/geometry";
import { point2Distance, type Vec2 } from "@lib/utils/vec2";
import React from "react";

export type DraggableProps = {
    handleRef: React.RefObject<HTMLElement>;
    draggableRef: React.RefObject<HTMLElement>;
    isDraggable: boolean;
    initialTranslation?: Vec2;
};

export function useDraggable({ handleRef, draggableRef, isDraggable, initialTranslation }: DraggableProps) {
    const [isDragging, setIsDragging] = React.useState(false);

    React.useEffect(
        function mouseEventEffects() {
            const offsets: { x: number; y: number } = {
                x: 0,
                y: 0,
            };
            let pointerDownPosition: Vec2 | null = null;
            let _isDragging = false;
            let dragOffset = { x: 0, y: 0 };
            let initialTransform = ""; // Capture the initial transform

            function handleMouseDown(e: MouseEvent) {
                if (!isDraggable) {
                    return;
                }

                const draggable = draggableRef.current;
                if (!draggable) {
                    return;
                }

                // Capture the initial transform when dragging starts
                const computedStyle = window.getComputedStyle(draggable);
                initialTransform = computedStyle.transform !== "none" ? computedStyle.transform : "";

                const rect = draggable.getBoundingClientRect();
                offsets.x = e.clientX - rect.left;
                offsets.y = e.clientY - rect.top;

                pointerDownPosition = { x: e.clientX, y: e.clientY };

                document.addEventListener("mousemove", handleMouseMove);
                document.addEventListener("mouseup", handleMouseUp);
            }

            function handleMouseMove(e: MouseEvent) {
                if (!pointerDownPosition) {
                    return;
                }

                if (!_isDragging) {
                    const distance = point2Distance(pointerDownPosition, { x: e.clientX, y: e.clientY });
                    if (distance > MANHATTAN_LENGTH) {
                        _isDragging = true;
                        // Prevent text selection when dragging starts
                        document.body.style.userSelect = "none";
                        document.body.style.webkitUserSelect = "none";
                    } else {
                        return;
                    }
                }

                e.preventDefault();
                e.stopPropagation();

                const draggable = draggableRef.current;
                if (!draggable) {
                    return;
                }

                // Calculate the drag offset from initial pointer position
                dragOffset.x = e.clientX - pointerDownPosition.x;
                dragOffset.y = e.clientY - pointerDownPosition.y;

                // Apply drag translation while preserving initial transform
                const dragTransform = `translate(${dragOffset.x}px, ${dragOffset.y}px)`;
                draggable.style.transform = initialTransform ? `${initialTransform} ${dragTransform}` : dragTransform;

                setIsDragging(true);
            }

            function handleMouseUp() {
                pointerDownPosition = null;
                _isDragging = false;

                // Re-enable text selection
                document.body.style.userSelect = "";
                document.body.style.webkitUserSelect = "";

                document.removeEventListener("mousemove", handleMouseMove);
                document.removeEventListener("mouseup", handleMouseUp);
                setIsDragging(false);
            }

            handleRef.current?.addEventListener("mousedown", handleMouseDown);

            return function cleanup() {
                handleRef.current?.removeEventListener("mousedown", handleMouseDown);
                document.removeEventListener("mousemove", handleMouseMove);
                document.removeEventListener("mouseup", handleMouseUp);

                // Re-enable text selection
                document.body.style.userSelect = "";
                document.body.style.webkitUserSelect = "";
            };
        },
        [draggableRef, handleRef, isDraggable],
    );

    return { isDragging };
}
