import * as React from "react";

import { createPortal } from "react-dom";

export type DraggedElementPlaceholderProps = {
    /** The element that contains the sortable items (where data-item-id elements live). */
    containerEl: HTMLElement | null;
    /** The scrollable element that visually hosts the placeholder (should be position: relative). */
    scrollEl: HTMLElement | null;
    /** The id of the currently dragged item (matched via [data-item-id="<id>"]). */
    draggedItemId: string | null;
};

export function DraggedElementPlaceholder(props: DraggedElementPlaceholderProps): React.ReactElement | null {
    const placeholderRef = React.useRef<HTMLDivElement | null>(null);
    const animationFrameIdRef = React.useRef<number | null>(null);

    React.useEffect(
        function setupObserversAndListeners() {
            if (!props.scrollEl || !props.containerEl || !props.draggedItemId) return;

            function updatePlaceholderPosition(): void {
                const placeholder = placeholderRef.current;
                const scrollHost = props.scrollEl;
                const container = props.containerEl;
                const id = props.draggedItemId;

                if (!placeholder || !scrollHost || !container || !id) return;

                const targetSelector = `[data-item-id="${id}"]`;
                const target = container.querySelector<HTMLElement>(targetSelector);
                if (!target) return;

                const hostRect = scrollHost.getBoundingClientRect();
                const targetRect = target.getBoundingClientRect();

                const x = Math.round(targetRect.left - hostRect.left + scrollHost.scrollLeft);
                const y = Math.round(targetRect.top - hostRect.top + scrollHost.scrollTop);
                const width = Math.round(targetRect.width - 2);
                const height = Math.round(targetRect.height);

                placeholder.style.transform = `translate3d(${x}px, ${y}px, 0)`;
                placeholder.style.width = `${width}px`;
                placeholder.style.height = `${height}px`;
            }

            function scheduleUpdate(): void {
                if (animationFrameIdRef.current != null) return;
                animationFrameIdRef.current = requestAnimationFrame(function onFrame() {
                    animationFrameIdRef.current = null;
                    updatePlaceholderPosition();
                });
            }

            // Initial placement
            scheduleUpdate();

            function handleScroll() {
                scheduleUpdate();
            }
            function handleWindowResize() {
                scheduleUpdate();
            }

            props.scrollEl.addEventListener("scroll", handleScroll, { passive: true });
            window.addEventListener("resize", handleWindowResize, { passive: true });

            const resizeObserver = new ResizeObserver(function handleResize() {
                scheduleUpdate();
            });
            resizeObserver.observe(props.containerEl);
            resizeObserver.observe(props.scrollEl);

            return function cleanup() {
                props.scrollEl?.removeEventListener("scroll", handleScroll);
                window.removeEventListener("resize", handleWindowResize);
                resizeObserver.disconnect();
                if (animationFrameIdRef.current != null) {
                    cancelAnimationFrame(animationFrameIdRef.current);
                }
                animationFrameIdRef.current = null;
            };
        },
        [props.scrollEl, props.containerEl, props.draggedItemId],
    );

    if (!props.scrollEl || !props.containerEl || !props.draggedItemId) {
        return null;
    }

    return createPortal(
        <div
            ref={placeholderRef}
            data-sl-indicator
            className="absolute top-0 left-0 pointer-events-none bg-blue-500"
            style={{
                transform: "translate3d(0,0,0)",
                willChange: "transform,width,height",
            }}
        />,
        props.scrollEl,
    );
}
