import React from "react";

function getItems(scrollContainer: HTMLElement, itemSelector: string): HTMLElement[] {
    return Array.from(scrollContainer.querySelectorAll<HTMLElement>(itemSelector));
}

// Measured against the scroll container itself: offsetLeft is relative to the offsetParent and ignores the
// container's left padding - a target off by that much can be rejected by mandatory scroll snapping,
// leaving the strip stuck.
function getItemLeftInScrollContainer(item: HTMLElement, scrollContainer: HTMLElement): number {
    return (
        item.getBoundingClientRect().left - scrollContainer.getBoundingClientRect().left + scrollContainer.scrollLeft
    );
}

export type UseHorizontalStepScrollOptions = {
    // CSS selector, evaluated within the scroll container, matching each item that the
    // previous/next steps and scrollItemIntoView() operate on.
    itemSelector: string;
    // When this string changes the hook recomputes its scroll state in a layout effect. Pass a value
    // derived from the item set/order (e.g. their ids joined) - a bare array reference won't register
    // as changed if it's mutated in place.
    itemsKey?: string;
};

/** Return value of {@link useHorizontalStepScroll}. */
export type UseHorizontalStepScrollResult = {
    /** Attach to the scrollable element itself. */
    scrollContainerRef: React.RefObject<HTMLDivElement>;
    /** Attach to the (typically wider) content wrapper inside the scroll container. */
    contentRef: React.RefObject<HTMLDivElement>;
    /** Whether there's an earlier item to scroll back to. */
    canScrollToPrevious: boolean;
    /** Whether there's a later item to scroll forward to. */
    canScrollToNext: boolean;
    /** Scrolls back by exactly one item. */
    scrollToPrevious: () => void;
    /** Scrolls forward by exactly one item. */
    scrollToNext: () => void;
    /** Scrolls the item at `index` into view, if it isn't already fully visible. */
    scrollItemIntoView: (index: number) => void;
};

/**
 * Item-by-item horizontal scrolling of an overflowing strip: steps of exactly one item, and whether
 * there's anywhere left to step to (e.g. for previous/next chevrons).
 *
 * Attach `scrollContainerRef` to the scrollable element and `contentRef` to its content wrapper; items
 * are found in it via `itemSelector`.
 */
export function useHorizontalStepScroll(options: UseHorizontalStepScrollOptions): UseHorizontalStepScrollResult {
    const { itemSelector, itemsKey } = options;

    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const contentRef = React.useRef<HTMLDivElement>(null);
    const [canScrollToPrevious, setCanScrollToPrevious] = React.useState<boolean>(false);
    const [canScrollToNext, setCanScrollToNext] = React.useState<boolean>(false);

    const updateScrollOptions = React.useCallback(
        function updateScrollOptions() {
            const el = scrollContainerRef.current;
            const contentEl = contentRef.current;
            if (!el || !contentEl) {
                return;
            }

            const maxScrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);

            // Fully scrolled left isn't necessarily 0 - with left padding, it's at the first item's left edge
            const items = getItems(el, itemSelector);
            const firstItemLeft = items.length > 0 ? getItemLeftInScrollContainer(items[0], el) : 0;
            const prev = el.scrollLeft > firstItemLeft + 1;
            const next = maxScrollLeft > 1 && el.scrollLeft < maxScrollLeft - 1;

            // State is derived from DOM measurements only available after layout, so it must be set
            // from an effect.
            // eslint-disable-next-line @eslint-react/set-state-in-effect
            setCanScrollToPrevious(prev);
            // eslint-disable-next-line @eslint-react/set-state-in-effect
            setCanScrollToNext(next);
        },
        [itemSelector],
    );

    React.useLayoutEffect(
        function recomputeOnItemsChange() {
            updateScrollOptions();
        },
        [itemsKey, updateScrollOptions],
    );

    React.useEffect(
        function observeScrollContainer() {
            const el = scrollContainerRef.current;
            const contentEl = contentRef.current;
            if (!el || !contentEl) {
                return;
            }

            // Observe both the scroll container (its allotted width can change, e.g. on window
            // resize) and the content itself (its natural width changes whenever an item is added or
            // removed), since either one can change whether the content overflows.
            const handleResize = () => updateScrollOptions();
            const handleScroll = () => updateScrollOptions();
            const resizeObserver = new ResizeObserver(handleResize);
            resizeObserver.observe(el);
            resizeObserver.observe(contentEl);
            el.addEventListener("scroll", handleScroll);

            return () => {
                resizeObserver.disconnect();
                el.removeEventListener("scroll", handleScroll);
            };
        },
        [updateScrollOptions],
    );

    const scrollToPrevious = React.useCallback(
        function scrollToPrevious() {
            const el = scrollContainerRef.current;
            if (!el) {
                return;
            }
            const items = getItems(el, itemSelector);
            const previousItem = [...items]
                .reverse()
                .find((item) => getItemLeftInScrollContainer(item, el) < el.scrollLeft - 1);
            const target = previousItem ? getItemLeftInScrollContainer(previousItem, el) : 0;
            el.scrollTo({ left: target, behavior: "smooth" });
        },
        [itemSelector],
    );

    const scrollToNext = React.useCallback(
        function scrollToNext() {
            const el = scrollContainerRef.current;
            if (!el) {
                return;
            }
            const items = getItems(el, itemSelector);
            // Step by exactly one item, not by a full page. Finding "the first item not fully
            // visible" instead jumps forward by however many items currently fit in the viewport at
            // once - inconsistent with "previous" always stepping back by one.
            const nextItem = items.find((item) => getItemLeftInScrollContainer(item, el) > el.scrollLeft + 1);
            if (nextItem) {
                el.scrollTo({ left: getItemLeftInScrollContainer(nextItem, el), behavior: "smooth" });
            }
        },
        [itemSelector],
    );

    const scrollItemIntoView = React.useCallback(
        function scrollItemIntoView(index: number) {
            const el = scrollContainerRef.current;
            if (!el) {
                return;
            }
            const item = getItems(el, itemSelector)[index];
            if (!item) {
                return;
            }
            const itemLeft = getItemLeftInScrollContainer(item, el);
            const itemRight = itemLeft + item.getBoundingClientRect().width;
            const viewWidth = el.getBoundingClientRect().width;
            const viewLeft = el.scrollLeft;
            const viewRight = viewLeft + viewWidth;

            if (itemLeft < viewLeft) {
                el.scrollTo({ left: itemLeft, behavior: "smooth" });
            } else if (itemRight > viewRight) {
                el.scrollTo({ left: itemRight - viewWidth, behavior: "smooth" });
            }
        },
        [itemSelector],
    );

    return {
        scrollContainerRef,
        contentRef,
        canScrollToPrevious,
        canScrollToNext,
        scrollToPrevious,
        scrollToNext,
        scrollItemIntoView,
    };
}
