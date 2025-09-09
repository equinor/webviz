import * as React from "react";
import { createPortal } from "react-dom";
import { HoveredArea, ItemType } from "../sortableList";

type GroupDropOverlayProps = {
    containerEl: HTMLElement | null; // content container (e.g., <tbody>, <ul>, <div>)
    scrollEl: HTMLElement | null; // the scroll host (wrapper div or same as container)
    hoveredId: string | null; // context.hoveredElementId
    hoveredArea: HoveredArea | null; // context.hoveredArea
};

export function GroupDropOverlay({ containerEl, scrollEl, hoveredId, hoveredArea }: GroupDropOverlayProps) {
    const nodeRef = React.useRef<HTMLDivElement | null>(null);
    const rafRef = React.useRef<number | null>(null);

    // keep latest params for rAF
    const containerRef = React.useRef(containerEl);
    const scrollRef = React.useRef(scrollEl);
    const idRef = React.useRef(hoveredId);
    const areaRef = React.useRef(hoveredArea);
    containerRef.current = containerEl;
    scrollRef.current = scrollEl;
    idRef.current = hoveredId;
    areaRef.current = hoveredArea;

    const tick = React.useCallback(() => {
        const node = nodeRef.current;
        const host = scrollRef.current;
        const container = containerRef.current;
        const id = idRef.current;
        const area = areaRef.current;
        if (!node || !host || !container || !id) return;

        // only show when we're hovering a group and the area indicates "drop into group"
        const group = container.querySelector<HTMLElement>(`[data-item-id="${id}"][data-sortable="group"]`);
        if (!group) return;
        if (!(area === HoveredArea.HEADER || area === HoveredArea.CENTER)) {
            node.style.opacity = "0";
            rafRef.current = requestAnimationFrame(tick);
            return;
        }

        const hostRect = host.getBoundingClientRect();
        const groupRect = group.getBoundingClientRect();

        const left = Math.max(0, groupRect.left - hostRect.left);
        const top = Math.max(0, groupRect.top - hostRect.top);
        const right = Math.min(hostRect.width, groupRect.right - hostRect.left);
        const bottom = Math.min(hostRect.height, groupRect.bottom - hostRect.top);

        const w = Math.max(0, Math.round(right - left)) - 1;
        const h = Math.max(0, Math.round(bottom - top));
        const x = Math.round(left);
        const y = Math.round(top);

        node.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        node.style.width = `${w}px`;
        node.style.height = `${h}px`;
        node.style.opacity = "1";

        rafRef.current = requestAnimationFrame(tick);
    }, []);

    React.useEffect(() => {
        if (!containerEl || !scrollEl || !hoveredId) return;
        rafRef.current = requestAnimationFrame(tick);

        const onScroll = () => {
            // ensure we apply a fresh position immediately on scroll
            if (rafRef.current == null) tick();
        };
        scrollEl.addEventListener("scroll", onScroll, { passive: true });

        const ro = new ResizeObserver(() => tick());
        ro.observe(scrollEl);
        ro.observe(containerEl);

        return () => {
            scrollEl.removeEventListener("scroll", onScroll);
            ro.disconnect();
            if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        };
    }, [containerEl, scrollEl, hoveredId, tick]);

    if (!containerEl || !scrollEl || !hoveredId) return null;

    // host should be position: relative to anchor the overlay
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

    return createPortal(node, scrollEl);
}
