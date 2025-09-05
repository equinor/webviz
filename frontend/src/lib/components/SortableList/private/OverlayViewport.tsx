import * as React from "react";

export function OverlayViewport({
    rootEl, // SortableList root (position:relative)
    scrollEl, // current scroll container (tbody/div/ul)
    children,
}: {
    rootEl: HTMLElement | null;
    scrollEl: HTMLElement | null;
    children: React.ReactNode;
}) {
    const [, force] = React.useState(0);

    React.useEffect(() => {
        if (!rootEl || !scrollEl) return;

        const roRoot = new ResizeObserver(() => force((x) => x + 1));
        const roScroll = new ResizeObserver(() => force((x) => x + 1));
        roRoot.observe(rootEl);
        roScroll.observe(scrollEl);

        const onScroll = () => force((x) => x + 1);
        scrollEl.addEventListener("scroll", onScroll, { passive: true });

        return () => {
            roRoot.disconnect();
            roScroll.disconnect();
            scrollEl.removeEventListener("scroll", onScroll);
        };
    }, [rootEl, scrollEl]);

    if (!rootEl || !scrollEl) return null;

    const rootRect = rootEl.getBoundingClientRect();
    const scrollRect = scrollEl.getBoundingClientRect();

    // Positioned relative to the root, clipped to the scroll box
    const style: React.CSSProperties = {
        position: "absolute",
        left: Math.round(scrollRect.left - rootRect.left),
        top: Math.round(scrollRect.top - rootRect.top),
        width: Math.round(scrollRect.width),
        height: Math.round(scrollRect.height),
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: 100, // under ghost if you layer things
    };

    return (
        <div data-sl-viewport style={style}>
            {children}
        </div>
    );
}
