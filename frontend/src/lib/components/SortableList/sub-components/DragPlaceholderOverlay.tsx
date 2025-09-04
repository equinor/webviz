export function DragPlaceholderOverlay({
    scrollEl,
    draggedItem,
}: {
    scrollEl: HTMLElement | null;
    draggedItem: HTMLElement | null;
}) {
    if (!scrollEl || !draggedItem) return null;

    const draggedItemRect = draggedItem.getBoundingClientRect();
    const scrollRect = scrollEl.getBoundingClientRect();

    const left = Math.round(draggedItemRect.x - scrollRect.left - scrollEl.scrollLeft);
    const top = Math.round(draggedItemRect.y - scrollRect.top - scrollEl.scrollTop);

    return (
        <div
            data-sl-placeholder
            className="bg-blue-600 absolute pointer-events-none z-50"
            style={{
                left,
                top,
                width: Math.round(draggedItemRect.width),
                height: Math.round(draggedItemRect.height),
            }}
        />
    );
}
