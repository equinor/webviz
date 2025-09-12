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
    const targetRect = target.getBoundingClientRect();

    let top =
        ([HoveredArea.TOP, HoveredArea.HEADER].includes(props.hovered.area) ? targetRect.top : targetRect.bottom) -
        scrollRect.top +
        props.scrollEl.scrollTop;

    if (props.hovered.area === HoveredArea.CENTER) {
        const content = target.querySelector<HTMLElement>("[data-sortable-list-group-content]");
        if (content) {
            const contentRect = content.getBoundingClientRect();
            top = contentRect.top - scrollRect.top + props.scrollEl.scrollTop;
        }
    }

    const left = targetRect.left - scrollRect.left + props.scrollEl.scrollLeft;
    const width = props.scrollEl.clientWidth;

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
