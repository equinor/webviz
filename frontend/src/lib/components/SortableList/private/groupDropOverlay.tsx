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
    const nodeRef = React.useRef<HTMLDivElement | null>(null);
    const requestAnimationFrameRef = React.useRef<number | null>(null);

    const containerRef = React.useRef(props.containerEl);
    const scrollRef = React.useRef(props.scrollEl);
    containerRef.current = props.containerEl;
    scrollRef.current = props.scrollEl;

    const tick = React.useCallback(
        function tick() {
            const node = nodeRef.current;
            const host = scrollRef.current;
            const container = containerRef.current;
            const id = props.hoveredId;
            const area = props.hoveredArea;
            if (!node || !host || !container || !id) {
                return;
            }

            const hoveredElement = container.querySelector<HTMLElement>(`[data-item-id="${id}"]`);
            if (!hoveredElement) {
                node.style.display = "none";
                return;
            }

            const group = hoveredElement.closest<HTMLElement>(`[data-sortable="group"]`);
            if (!group) {
                node.style.display = "none";
                return;
            }

            if (hoveredElement === group && ![HoveredArea.HEADER, HoveredArea.CENTER].includes(area!)) {
                node.style.display = "none";
                return;
            }

            const hostRect = host.getBoundingClientRect();
            const groupRect = group.getBoundingClientRect();

            const left = Math.max(0, groupRect.left - hostRect.left + host.scrollLeft);
            const top = Math.max(0, groupRect.top - hostRect.top + host.scrollTop);

            const w = Math.max(0, groupRect.width);
            const h = Math.max(0, groupRect.height);
            const x = Math.round(left);
            const y = Math.round(top);

            node.style.transform = `translate3d(${x}px, ${y}px, 0)`;
            node.style.width = `${w}px`;
            node.style.height = `${h}px`;
            node.style.opacity = "1";
            node.style.display = "";

            requestAnimationFrameRef.current = requestAnimationFrame(tick);
        },
        [props.hoveredArea, props.hoveredId],
    );

    React.useEffect(
        function mountScrollAndResizeEffect() {
            const scrollEl = props.scrollEl;
            if (!props.containerEl || !scrollEl || !props.hoveredId) return;
            requestAnimationFrameRef.current = requestAnimationFrame(tick);

            function onScroll() {
                if (requestAnimationFrameRef.current == null) tick();
            }
            scrollEl.addEventListener("scroll", onScroll, { passive: true });

            const resizeObserver = new ResizeObserver(() => tick());
            resizeObserver.observe(scrollEl);
            resizeObserver.observe(props.containerEl);

            return function unmountScrollAndResizEffect() {
                scrollEl.removeEventListener("scroll", onScroll);
                resizeObserver.disconnect();
                if (requestAnimationFrameRef.current != null) {
                    cancelAnimationFrame(requestAnimationFrameRef.current);
                }
                requestAnimationFrameRef.current = null;
            };
        },
        [props.containerEl, props.scrollEl, props.hoveredId, tick],
    );

    if (!props.containerEl || !props.scrollEl || !props.hoveredId) {
        return null;
    }

    const node = (
        <div
            ref={nodeRef}
            data-sl-group-overlay
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                transform: "translate3d(0,0,0)",
                width: 0,
                height: 0,
                background: "rgba(59, 130, 246, 0.15)", // blue-500 @ 15%
                outline: "1px solid rgba(59, 130, 246, 0.35)",
                pointerEvents: "none",
                opacity: 0,
                willChange: "transform,width,height,opacity",
            }}
        />
    );

    return createPortal(node, props.scrollEl);
}
