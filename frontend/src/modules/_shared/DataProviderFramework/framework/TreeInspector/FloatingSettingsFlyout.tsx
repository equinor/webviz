import React from "react";

import { createPortal } from "react-dom";

const FLYOUT_WIDTH_PX = 360;
const FLYOUT_GAP_PX = 8;
const WINDOW_MARGIN_PX = 8;
/** Width of the flyout's border (Tailwind `border`) */
const FLYOUT_BORDER_PX = 1;

type FlyoutPosition = {
    left: number;
    top: number;
    maxHeight: number;
};

export type FloatingSettingsFlyoutProps = {
    /** Key of the row the flyout is aligned with */
    anchorRowKey: string;
    /** The flyout opens to the right of this element - the tree inspector filling the settings sidebar */
    sidebarElement: HTMLElement | null;
    scrollElement: HTMLElement | null;
    contentElement: HTMLElement | null;
    /** Changes whenever the rows may have moved, e.g. after expanding or moving items */
    layoutRevision: unknown;
    onClose: () => void;
    onPointerDownCapture: () => void;
    children: React.ReactNode;
};

/*
 * Rendered into the document body: the settings sidebar is a CSS containment context (contain: content), which would
 * otherwise make the fixed positioning relative to the sidebar instead of the window.
 */
export function FloatingSettingsFlyout(props: FloatingSettingsFlyoutProps): React.ReactNode {
    const { anchorRowKey, sidebarElement, scrollElement, contentElement, layoutRevision, onClose } = props;
    const [position, setPosition] = React.useState<FlyoutPosition | null>(null);
    const [flyoutContentElement, setFlyoutContentElement] = React.useState<HTMLDivElement | null>(null);

    React.useEffect(
        function trackAnchorRow() {
            if (!sidebarElement || !scrollElement || !contentElement) {
                return;
            }

            function update() {
                if (!sidebarElement || !scrollElement || !contentElement) {
                    return;
                }
                const sidebarRect = sidebarElement.getBoundingClientRect();
                const row = contentElement.querySelector(`[data-row-key="${CSS.escape(anchorRowKey)}"]`);
                const viewportRect = scrollElement.getBoundingClientRect();
                const rowRect = row?.getBoundingClientRect();

                // Hidden while the sidebar is not shown (another module is active) or the row is scrolled out of view
                const isHidden =
                    sidebarRect.width === 0 ||
                    !rowRect ||
                    rowRect.bottom <= viewportRect.top ||
                    rowRect.top >= viewportRect.bottom;
                if (isHidden) {
                    // eslint-disable-next-line @eslint-react/set-state-in-effect -- measured from the DOM
                    setPosition(null);
                    return;
                }
                const anchorTop = rowRect.top;

                // The content's own height - the flyout itself is limited to the window, so it can't be measured
                const contentHeight = (flyoutContentElement?.offsetHeight ?? 0) + FLYOUT_BORDER_PX * 2;
                const availableHeight = window.innerHeight - WINDOW_MARGIN_PX * 2;
                // Moved up just enough to show everything - only taller content than the window has to scroll
                const lowestTop = window.innerHeight - WINDOW_MARGIN_PX - Math.min(contentHeight, availableHeight);
                const top = Math.max(WINDOW_MARGIN_PX, Math.min(anchorTop, lowestTop));
                // eslint-disable-next-line @eslint-react/set-state-in-effect -- measured from the DOM
                setPosition({
                    left: sidebarRect.right + FLYOUT_GAP_PX,
                    top,
                    maxHeight: window.innerHeight - top - WINDOW_MARGIN_PX,
                });
            }

            update();
            scrollElement.addEventListener("scroll", update);
            window.addEventListener("resize", update);
            const resizeObserver = new ResizeObserver(update);
            resizeObserver.observe(sidebarElement);
            if (flyoutContentElement) {
                resizeObserver.observe(flyoutContentElement);
            }
            return () => {
                scrollElement.removeEventListener("scroll", update);
                window.removeEventListener("resize", update);
                resizeObserver.disconnect();
            };
        },
        [anchorRowKey, sidebarElement, scrollElement, contentElement, flyoutContentElement, layoutRevision],
    );

    function handleKeyDown(event: React.KeyboardEvent) {
        if (event.key !== "Escape") {
            return;
        }
        // Escape in an open dropdown or menu only closes that one
        const target = event.target as Element;
        if (target.closest('[role="listbox"],[role="menu"],[role="dialog"],[role="combobox"]')) {
            return;
        }
        onClose();
    }

    return createPortal(
        <div
            className="bg-canvas border-neutral-subtle z-overlay fixed flex flex-col overflow-auto rounded border shadow-lg"
            style={{
                width: FLYOUT_WIDTH_PX,
                left: position?.left ?? 0,
                top: position?.top ?? 0,
                maxHeight: position?.maxHeight,
                // Kept in the DOM while hidden, so it can be measured and keeps its state
                visibility: position ? "visible" : "hidden",
            }}
            onPointerDownCapture={props.onPointerDownCapture}
            onKeyDown={handleKeyDown}
        >
            <div ref={setFlyoutContentElement} className="flex shrink-0 flex-col">
                {props.children}
            </div>
        </div>,
        document.body,
    );
}
