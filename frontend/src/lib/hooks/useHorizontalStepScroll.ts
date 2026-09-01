import React from "react";

function getItems(scrollContainer: HTMLElement, itemSelector: string): HTMLElement[] {
    return Array.from(scrollContainer.querySelectorAll<HTMLElement>(itemSelector));
}

// An item's own offsetLeft is relative to its offsetParent, not to the scroll container - so it
// doesn't account for the scroll container's own left padding. Computing scroll targets from raw
// offsetLeft therefore undershoots by exactly that padding amount, which - combined with
// scroll-snap-type: x mandatory - can make the browser reject the scroll outright (a mandatory
// snap container won't land on a position that isn't a valid snap point), leaving scrollLeft
// stuck. Measuring via getBoundingClientRect deltas against the scroll container itself is
// padding/offsetParent-agnostic and gives the item's true position in the container's own
// scrollable coordinate space.
function getItemLeftInScrollContainer(item: HTMLElement, scrollContainer: HTMLElement): number {
    return item.getBoundingClientRect().left - scrollContainer.getBoundingClientRect().left + scrollContainer.scrollLeft;
}

export type UseHorizontalStepScrollOptions = {
    // CSS selector, evaluated within the scroll container, matching each item that the
    // previous/next steps and scrollItemIntoView() operate on.
    itemSelector: string;
    // When this string changes the hook recomputes its scroll state and runs onItemsChange() in a
    // layout effect. Pass a value derived from the item set/order (e.g. their ids joined) - a bare
    // array reference won't register as changed if it's mutated in place.
    itemsKey?: string;
    // Runs in a layout effect whenever itemsKey changes, after the forced recompute. Use it to make
    // a dependent measurement-based component remeasure (e.g. base-ui <Tabs.Indicator/> after a
    // reorder of same-sized tabs, which its own ResizeObserver never catches).
    onItemsChange?: () => void;
};

export type UseHorizontalStepScrollResult = {
    scrollContainerRef: React.RefObject<HTMLDivElement>;
    contentRef: React.RefObject<HTMLDivElement>;
    canScrollToPrevious: boolean;
    canScrollToNext: boolean;
    scrollToPrevious: () => void;
    scrollToNext: () => void;
    scrollItemIntoView: (index: number) => void;
};

// Owns the horizontal, item-by-item scroll behaviour of an overflowing strip: the state driving
// previous/next chevrons, the observers that keep it fresh, and a layout-effect hook for callers
// that need to react to the item set changing.
export function useHorizontalStepScroll(options: UseHorizontalStepScrollOptions): UseHorizontalStepScrollResult {
    const { itemSelector, itemsKey } = options;

    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const contentRef = React.useRef<HTMLDivElement>(null);
    const [canScrollToPrevious, setCanScrollToPrevious] = React.useState<boolean>(false);
    const [canScrollToNext, setCanScrollToNext] = React.useState<boolean>(false);

    // Keep the caller's callback in a ref so it doesn't have to be a stable reference or a hook
    // dependency.
    const onItemsChangeRef = React.useRef(options.onItemsChange);
    onItemsChangeRef.current = options.onItemsChange;

    const updateScrollButtonsState = React.useCallback(
        function updateScrollButtonsState() {
            const el = scrollContainerRef.current;
            const contentEl = contentRef.current;
            if (!el || !contentEl) {
                return;
            }

            const containerWidth = el.getBoundingClientRect().width;
            const contentWidth = contentEl.getBoundingClientRect().width;
            const maxScrollLeft = Math.max(0, contentWidth - containerWidth);

            // The first item's true resting scrollLeft isn't necessarily 0 - the scroll container's
            // own left padding means the natural, fully-scrolled-left position sits at the first
            // item's actual left edge, not exactly 0. Comparing against a bare `> 1` threshold would
            // leave the left chevron visible even when there's nothing left to scroll to.
            // getItemLeftInScrollContainer already accounts for this (used by the scroll handlers
            // below), so reuse it here for consistency.
            const items = getItems(el, itemSelector);
            const firstItemLeft = items.length > 0 ? getItemLeftInScrollContainer(items[0], el) : 0;
            const prev = el.scrollLeft > firstItemLeft + 1;
            const next = maxScrollLeft > 1 && el.scrollLeft < maxScrollLeft - 1;

            setCanScrollToPrevious(prev);
            setCanScrollToNext(next);
        },
        [itemSelector],
    );

    React.useLayoutEffect(
        function recomputeOnItemsChange() {
            onItemsChangeRef.current?.();
            updateScrollButtonsState();
        },
        [itemsKey, updateScrollButtonsState],
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
            const handleResize = () => updateScrollButtonsState();
            const handleScroll = () => updateScrollButtonsState();
            const resizeObserver = new ResizeObserver(handleResize);
            resizeObserver.observe(el);
            resizeObserver.observe(contentEl);
            el.addEventListener("scroll", handleScroll);

            return () => {
                resizeObserver.disconnect();
                el.removeEventListener("scroll", handleScroll);
            };
        },
        [updateScrollButtonsState],
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
