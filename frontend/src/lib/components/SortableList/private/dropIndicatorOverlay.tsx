import React from "react";

import { createPortal } from "react-dom";

import type { Rect2D } from "@lib/utils/geometry";
import { rectsAreEqual } from "@lib/utils/geometry";

import { HoveredArea } from "../sortableList";

export type DropIndicatorOverlayProps = {
    containerEl: HTMLElement | null;
    scrollEl: HTMLElement | null;
    hovered: { id: string; area: HoveredArea } | null;
};

export function DropIndicatorOverlay(props: DropIndicatorOverlayProps): React.ReactElement | null {
    const [geometry, setGeometry] = React.useState<Rect2D | null>(null);
    const prevGeometryRef = React.useRef<Rect2D | null>(null);

    React.useLayoutEffect(
        function computeAndSubscribe() {
            const containerEl = props.containerEl;
            const scrollEl = props.scrollEl;
            const hoveredId = props.hovered?.id;
            const hoveredArea = props.hovered?.area;

            if (!containerEl || !scrollEl || !hoveredId || !hoveredArea) {
                setGeometry(null);
                prevGeometryRef.current = null;
                return;
            }

            function findTargetElement(container: HTMLElement, id: string): HTMLElement | null {
                return container.querySelector<HTMLElement>(`[data-item-id="${id}"]`);
            }

            function getContentElement(target: HTMLElement): HTMLElement | null {
                return target.querySelector<HTMLElement>("[data-sortable-list-group-content]");
            }

            function computeGeometry(): Rect2D | null {
                const target = findTargetElement(containerEl!, hoveredId!);
                if (!target) return null;

                const scrollRect = scrollEl!.getBoundingClientRect();
                const targetRect = target.getBoundingClientRect();

                const top = computeTop(scrollRect.top, targetRect, hoveredArea!, target, scrollEl!);

                let left = targetRect.left - scrollRect.left + scrollEl!.scrollLeft;
                let width = targetRect.width;

                if (hoveredArea === HoveredArea.CENTER) {
                    const content = getContentElement(target);
                    if (content) {
                        const clientRect = content.getBoundingClientRect();
                        left = clientRect.left - scrollRect.left + scrollEl!.scrollLeft;
                        width = clientRect.width;
                    }
                }

                return {
                    y: Math.round(top) - 1,
                    x: Math.round(left),
                    width: Math.round(width),
                    height: 2,
                };
            }

            let rafId: number | null = null;

            function scheduleCompute(): void {
                if (rafId != null) return;
                rafId = requestAnimationFrame(function onFrame() {
                    rafId = null;
                    const next = computeGeometry();
                    if (!prevGeometryRef.current || !next || !rectsAreEqual(prevGeometryRef.current, next)) {
                        prevGeometryRef.current = next;
                        setGeometry(next);
                    }
                });
            }

            // initial position
            scheduleCompute();

            function handleScroll(): void {
                scheduleCompute();
            }
            function handleResize(): void {
                scheduleCompute();
            }

            scrollEl.addEventListener("scroll", handleScroll, { passive: true });
            window.addEventListener("resize", handleResize);

            const resizeObserver = new ResizeObserver(function onResizeObserved() {
                scheduleCompute();
            });
            resizeObserver.observe(scrollEl);
            resizeObserver.observe(containerEl);

            return function cleanup() {
                scrollEl.removeEventListener("scroll", handleScroll);
                window.removeEventListener("resize", handleResize);
                resizeObserver.disconnect();
                if (rafId != null) {
                    cancelAnimationFrame(rafId);
                }
            };
        },
        [props.containerEl, props.scrollEl, props.hovered?.id, props.hovered?.area],
    );

    if (!props.containerEl || !props.scrollEl || !props.hovered || !geometry) {
        return null;
    }

    return createPortal(
        <div
            data-sl-indicator
            className="absolute top-0 left-0 bg-blue-600 pointer-events-none z-10"
            style={{
                transform: `translate3d(${geometry.x}px, ${geometry.y}px, 0)`,
                width: geometry.width,
                height: geometry.height,
                willChange: "transform",
            }}
        />,
        props.scrollEl,
    );
}

function computeTop(
    scrollTopViewport: number,
    targetRect: DOMRect,
    area: HoveredArea,
    targetEl: HTMLElement,
    scrollEl: HTMLElement,
): number {
    switch (area) {
        case HoveredArea.TOP:
        case HoveredArea.HEADER:
            return targetRect.top - scrollTopViewport + scrollEl.scrollTop;
        case HoveredArea.CENTER: {
            const contentEl = targetEl.querySelector<HTMLElement>("[data-sortable-list-group-content]");
            if (contentEl) {
                const cr = contentEl.getBoundingClientRect();
                return cr.top - scrollTopViewport + scrollEl.scrollTop;
            }
            return targetRect.top - scrollTopViewport + scrollEl.scrollTop;
        }
        default:
            return targetRect.bottom - scrollTopViewport + scrollEl.scrollTop;
    }
}
