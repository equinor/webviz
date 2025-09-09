import { createPortal } from "react-dom";

import { HoveredArea } from "../sortableList";

export type DropIndicatorOverlayProps = {
    containerEl: HTMLElement | null;
    scrollEl: HTMLElement | null;
    hovered: { id: string; area: HoveredArea } | null;
};

export function DropIndicatorOverlay(props: DropIndicatorOverlayProps) {
    if (!props.containerEl || !props.scrollEl || !props.hovered) return null;

    const target = props.containerEl.querySelector<HTMLElement>(`[data-item-id="${props.hovered.id}"]`);
    if (!target) return null;

    const scrollRect = props.scrollEl.getBoundingClientRect();
    const containerRect = props.containerEl.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    const top = (props.hovered.area === HoveredArea.TOP ? targetRect.top : targetRect.bottom) - scrollRect.top;
    const left = containerRect.left - scrollRect.left;
    const width = containerRect.width - 1;

    if (top > scrollRect.height) return null;
    if (top < 0) return null;

    return createPortal(
        <div
            data-sl-indicator
            style={{
                position: "absolute",
                top: Math.round(top) - 1,
                left: Math.round(left),
                width: Math.round(width),
                height: 2,
                background: "#3b82f6",
                pointerEvents: "none",
            }}
        />,
        props.scrollEl,
    );
}
