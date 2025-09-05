import { createPortal } from "react-dom";

import { HoveredArea } from "../sortableList";

export function DropIndicatorOverlay({
    containerEl,
    scrollEl,
    hovered,
}: {
    containerEl: HTMLElement | null;
    scrollEl: HTMLElement | null;
    hovered: { id: string; area: HoveredArea } | null;
}) {
    // nothing to draw
    if (!containerEl || !scrollEl || !hovered) return null;

    const target = containerEl.querySelector<HTMLElement>(`[data-item-id="${hovered.id}"]`);
    if (!target) return null;

    const scrollRect = scrollEl.getBoundingClientRect();
    const containerRect = containerEl.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    const y = (hovered.area === HoveredArea.TOP ? targetRect.top : targetRect.bottom) - scrollRect.top;
    const left = containerRect.left - scrollRect.left;
    const width = containerRect.width;

    if (y > scrollRect.height) return null;
    if (y < 0) return null;

    return createPortal(
        <div
            data-sl-indicator
            style={{
                position: "absolute",
                top: Math.round(y) - 1,
                left: Math.round(left),
                width: Math.round(width),
                height: 2,
                background: "#3b82f6",
                pointerEvents: "none",
            }}
        />,
        scrollEl,
    );
}
