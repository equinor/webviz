import React from "react";

import type { Dashboard } from "@framework/internal/Dashboard";

function getDashboardTabElements(scrollContainer: HTMLElement): HTMLElement[] {
    return Array.from(scrollContainer.querySelectorAll<HTMLElement>('[role="tab"]'));
}

// A tab's own offsetLeft is relative to its offsetParent (Tabs.List, which is position:
// relative), not to the scroll container - so it doesn't account for the scroll container's
// own left padding (px-xs). Computing scroll targets from raw offsetLeft therefore undershoots
// by exactly that padding amount, which - combined with scroll-snap-type: x mandatory - made
// the browser reject the scroll outright (a mandatory snap container won't land on a position
// that isn't a valid snap point), leaving scrollLeft stuck. Measuring via getBoundingClientRect
// deltas against the scroll container itself is padding/offsetParent-agnostic and gives the
// tab's true position in the container's own scrollable coordinate space.
function getTabLeftInScrollContainer(tab: HTMLElement, scrollContainer: HTMLElement): number {
    return tab.getBoundingClientRect().left - scrollContainer.getBoundingClientRect().left + scrollContainer.scrollLeft;
}

export type UseDashboardTabStripScrollResult = {
    scrollContainerRef: React.RefObject<HTMLDivElement>;
    contentRef: React.RefObject<HTMLDivElement>;
    canScrollToPrevious: boolean;
    canScrollToNext: boolean;
    scrollToPrevious: () => void;
    scrollToNext: () => void;
};

// Owns the horizontal scroll behaviour of the dashboard tab strip: the state driving the
// previous/next chevrons, the observers that keep it fresh, and the forced re-render that lets
// Tabs.Indicator remeasure after a reorder (see resyncTabStripOnDashboardsChange below).
export function useDashboardTabStripScroll(dashboards: Dashboard[]): UseDashboardTabStripScrollResult {
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const contentRef = React.useRef<HTMLDivElement>(null);
    const [canScrollToPrevious, setCanScrollToPrevious] = React.useState<boolean>(false);
    const [canScrollToNext, setCanScrollToNext] = React.useState<boolean>(false);

    const updateScrollButtonsState = React.useCallback(function updateScrollButtonsState() {
        const el = scrollContainerRef.current;
        const contentEl = contentRef.current;
        if (!el || !contentEl) {
            return;
        }

        const containerWidth = el.getBoundingClientRect().width;
        const contentWidth = contentEl.getBoundingClientRect().width;
        const maxScrollLeft = Math.max(0, contentWidth - containerWidth);

        // The first tab's true resting scrollLeft isn't 0 - the scroll container's own left
        // padding (px-xs) means the natural, fully-scrolled-left position sits at the first tab's
        // actual left edge (e.g. ~8px, matching the padding), not exactly 0. Comparing against a
        // bare `> 1` threshold left the left chevron visible even when there was nothing left to
        // scroll to. getTabLeftInScrollContainer already accounts for this (used by the click
        // handlers below), so reuse it here for consistency.
        const tabs = getDashboardTabElements(el);
        const firstTabLeft = tabs.length > 0 ? getTabLeftInScrollContainer(tabs[0], el) : 0;
        const prev = el.scrollLeft > firstTabLeft + 1;
        const next = maxScrollLeft > 1 && el.scrollLeft < maxScrollLeft - 1;

        setCanScrollToPrevious(prev);
        setCanScrollToNext(next);
    }, []);

    // Tabs.Indicator (the active-tab underline) computes its position from getBoundingClientRect()
    // during React's render phase, i.e. before the reorder's DOM mutation is committed - so the
    // render triggered by the reorder itself always reads the pre-move position. Base-ui only gives
    // it a second, post-commit chance to re-measure via a ResizeObserver, which never fires for a
    // pure reorder of same-sized tabs (no element's size changes). Without this, the indicator gets
    // stuck at its pre-reorder position until some unrelated interaction (e.g. switching tabs) forces
    // a fresh measurement. Forcing an extra render after the tab order changes gives it that missing
    // post-commit remeasure.
    //
    // Depend on the *ordered id sequence* (a fresh string each render), not on `dashboards` itself:
    // PrivateWorkbenchSession.moveDashboard() reorders the underlying array in place (splice), it
    // never replaces it, so the array reference stays identical across a reorder and would never
    // register as a changed dependency.
    const dashboardOrderKey = dashboards.map((dashboard) => dashboard.getId()).join("|");
    const [, forceIndicatorSync] = React.useReducer((count: number) => count + 1, 0);
    React.useLayoutEffect(
        function resyncTabStripOnDashboardsChange() {
            forceIndicatorSync();
            updateScrollButtonsState();
        },
        [dashboardOrderKey, updateScrollButtonsState],
    );

    React.useEffect(
        function observeTabsScrollContainer() {
            const el = scrollContainerRef.current;
            const contentEl = contentRef.current;
            if (!el || !contentEl) {
                return;
            }

            // Observe both the scroll container (its allotted width can change, e.g. on window
            // resize) and the tab content itself (its natural width changes whenever a dashboard
            // is added or removed), since either one can change whether the content overflows.
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

    const scrollToPrevious = React.useCallback(function scrollToPrevious() {
        const el = scrollContainerRef.current;
        if (!el) {
            return;
        }
        const tabs = getDashboardTabElements(el);
        const previousTab = [...tabs].reverse().find((tab) => getTabLeftInScrollContainer(tab, el) < el.scrollLeft - 1);
        const target = previousTab ? getTabLeftInScrollContainer(previousTab, el) : 0;
        el.scrollTo({ left: target, behavior: "smooth" });
    }, []);

    const scrollToNext = React.useCallback(function scrollToNext() {
        const el = scrollContainerRef.current;
        if (!el) {
            return;
        }
        const tabs = getDashboardTabElements(el);
        // Mirrors scrollToPrevious: step by exactly one tab, not by a full page. Finding "the first
        // tab not fully visible" instead jumps forward by however many tabs currently fit in the
        // viewport at once (observed: with 7 tabs fitting at once, one click jumped from tab 4
        // straight to tab 10) - inconsistent with "previous" always stepping back by one.
        const nextTab = tabs.find((tab) => getTabLeftInScrollContainer(tab, el) > el.scrollLeft + 1);
        if (nextTab) {
            el.scrollTo({ left: getTabLeftInScrollContainer(nextTab, el), behavior: "smooth" });
        }
    }, []);

    return {
        scrollContainerRef,
        contentRef,
        canScrollToPrevious,
        canScrollToNext,
        scrollToPrevious,
        scrollToNext,
    };
}
