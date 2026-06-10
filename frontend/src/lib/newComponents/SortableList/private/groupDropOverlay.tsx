import * as React from "react";

import { createPortal } from "react-dom";

import { HoveredArea } from "../sortableList";

type GroupDropOverlayProps = {
    containerEl: HTMLElement | null; // content container (e.g., <tbody>, <ul>, <div>)
    scrollEl: HTMLElement | null; // the scroll host (wrapper div or same as container)
    hoveredId: string | null; // context.hoveredElementId
    hoveredArea: HoveredArea | null; // context.hoveredArea
};

export function GroupDropOverlay(props: GroupDropOverlayProps) {
    const overlayRef = React.useRef<HTMLDivElement | null>(null);
    const rafIdRef = React.useRef<number | null>(null);

    React.useLayoutEffect(
        function mountListeners() {
            const containerEl = props.containerEl;
            const scrollEl = props.scrollEl;
            const hoveredId = props.hoveredId;
            const hoveredArea = props.hoveredArea;

            if (!containerEl || !scrollEl || !hoveredId || !hoveredArea) return;

            function findHoveredElement(container: HTMLElement, id: string): HTMLElement | null {
                return container.querySelector<HTMLElement>(`[data-item-id="${id}"]`);
            }

            function findGroupElement(el: HTMLElement): HTMLElement | null {
                return el.closest<HTMLElement>(`[data-sortable="group"]`);
            }

            function updateOverlayPosition(): void {
                const overlay = overlayRef.current;
                if (!overlay) return;

                const hoveredEl = findHoveredElement(containerEl!, hoveredId!);
                if (!hoveredEl) {
                    overlay.style.display = "none";
                    return;
                }

                const groupEl = findGroupElement(hoveredEl);
                if (!groupEl) {
                    overlay.style.display = "none";
                    return;
                }

                // If hovering the group box itself but not header/center, don't show overlay
                if (hoveredEl === groupEl && hoveredArea !== HoveredArea.HEADER && hoveredArea !== HoveredArea.CENTER) {
                    overlay.style.display = "none";
                    return;
                }

                const hostRect = scrollEl!.getBoundingClientRect();
                const groupRect = groupEl.getBoundingClientRect();

                const left = Math.max(0, groupRect.left - hostRect.left + scrollEl!.scrollLeft);
                const top = Math.max(0, groupRect.top - hostRect.top + scrollEl!.scrollTop);

                const width = Math.max(0, groupRect.width);
                const height = Math.max(0, groupRect.height);

                overlay.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`;
                overlay.style.width = `${Math.round(width)}px`;
                overlay.style.height = `${Math.round(height)}px`;
                overlay.style.display = "";
            }

            function scheduleUpdate(): void {
                if (rafIdRef.current != null) return;
                rafIdRef.current = requestAnimationFrame(function onFrame() {
                    rafIdRef.current = null;
                    updateOverlayPosition();
                });
            }

            // Initial position
            scheduleUpdate();

            function handleScroll(): void {
                scheduleUpdate();
            }
            function handleWindowResize(): void {
                scheduleUpdate();
            }
            function handleObservedResize(): void {
                scheduleUpdate();
            }

            scrollEl.addEventListener("scroll", handleScroll, { passive: true });
            window.addEventListener("resize", handleWindowResize);

            const resizeObserver = new ResizeObserver(function onResize() {
                handleObservedResize();
            });

            resizeObserver.observe(scrollEl);
            resizeObserver.observe(containerEl);

            return function cleanup() {
                scrollEl.removeEventListener("scroll", handleScroll);
                window.removeEventListener("resize", handleWindowResize);
                resizeObserver.disconnect();
                if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            };
        },
        [props.containerEl, props.scrollEl, props.hoveredId, props.hoveredArea],
    );

    if (!props.containerEl || !props.scrollEl || !props.hoveredId) {
        return null;
    }

    return createPortal(
        <div
            ref={overlayRef}
            data-sl-group-overlay
            className="absolute top-0 left-0 bg-blue-500 outline-blue-600 pointer-events-none z-10 opacity-30"
            style={{
                transform: "translate3d(0,0,0)",
                width: 0,
                height: 0,
                willChange: "transform,width,height",
            }}
        />,
        props.scrollEl,
    );
}
