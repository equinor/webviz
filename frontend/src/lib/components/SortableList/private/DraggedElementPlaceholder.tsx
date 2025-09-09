import * as React from "react";
import { createPortal } from "react-dom";

export type DraggedElementPlaceholderProps = {
    containerEl: HTMLElement | null; // e.g. <tbody>, <ul>, ...
    scrollEl: HTMLElement | null; // scroll host (wrapper div or same as container)
    draggedItemId: string | null;
};

export function DraggedElementPlaceholder({ containerEl, scrollEl, draggedItemId }: DraggedElementPlaceholderProps) {
    const nodeRef = React.useRef<HTMLDivElement | null>(null);
    const rafRef = React.useRef<number | null>(null);

    const containerRef = React.useRef(containerEl);
    const scrollRef = React.useRef(scrollEl);
    const idRef = React.useRef(draggedItemId);
    containerRef.current = containerEl;
    scrollRef.current = scrollEl;
    idRef.current = draggedItemId;

    const tick = React.useCallback(function tick() {
        const node = nodeRef.current;
        const host = scrollRef.current;
        const container = containerRef.current;
        const id = idRef.current;
        if (!node || !host || !container || !id) return;

        const target = container.querySelector<HTMLElement>(`[data-item-id="${id}"]`);
        if (!target) return;

        const hostR = host.getBoundingClientRect();
        const targetR = target.getBoundingClientRect();

        const x = Math.round(targetR.left - hostR.left);
        const y = Math.round(targetR.top - hostR.top);
        const w = Math.round(targetR.width - 2);
        const h = Math.round(targetR.height);

        node.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        node.style.width = `${w}px`;
        node.style.height = `${h}px`;

        rafRef.current = requestAnimationFrame(tick);
    }, []);

    React.useEffect(
        function addScrollAndResizeEffects() {
            if (!scrollEl || !containerEl || !draggedItemId) {
                return;
            }
            rafRef.current = requestAnimationFrame(tick);

            function onScroll() {
                if (rafRef.current == null) {
                    tick();
                }
            }
            scrollEl.addEventListener("scroll", onScroll, { passive: true });

            const resizeObserver = new ResizeObserver(() => tick());
            resizeObserver.observe(containerEl);

            return function removeScrollAndResizeEffects() {
                scrollEl.removeEventListener("scroll", onScroll);
                resizeObserver.disconnect();
                if (rafRef.current != null) {
                    cancelAnimationFrame(rafRef.current);
                }
                rafRef.current = null;
            };
        },
        [scrollEl, containerEl, draggedItemId, tick],
    );

    if (!scrollEl || !containerEl || !draggedItemId) return null;

    const node = (
        <div
            ref={nodeRef}
            data-sl-indicator
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                transform: "translate3d(0,0,0)",
                pointerEvents: "none",
                background: "#3b82f6",
                willChange: "transform,width,height",
            }}
        />
    );

    return createPortal(node, scrollEl);
}
