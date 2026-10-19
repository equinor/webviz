import React from "react";

import type { Dashboard } from "@framework/internal/Dashboard";

export type UseDashboardTabRovingFocusResult = {
    /** tabIndex for a given dashboard's select button - exactly one dashboard ever gets 0. */
    getTabIndex: (dashboardId: string) => 0 | -1;
    /** The tab currently in the tab order, read from the DOM - e.g. to return focus to. */
    getTabStopElement: () => HTMLElement | null;
    /** Attach to the tab strip container. */
    onKeyDown: (event: React.KeyboardEvent) => void;
};

// Arrow-key navigation for the dashboard tab strip, replacing what base-ui's Tabs.Root gave for free
// before this strip moved off it. Follows the standard roving-tabindex pattern: exactly one tab (plus
// its actions button) is in the page's normal Tab-key order (tabIndex=0), everything else is
// tabIndex=-1, and Left/Right/Home/End move both DOM focus and that tab stop directly.
//
// Uses "manual activation": arrow keys only move focus, and Enter/Space (the tab buttons' own click)
// opens the focused dashboard. Switching dashboards isn't instant, so it shouldn't happen for every
// tab passed on the way.
export function useDashboardTabRovingFocus(
    dashboards: Dashboard[],
    activeDashboardId: string | null,
    contentRef: React.RefObject<HTMLDivElement>,
): UseDashboardTabRovingFocusResult {
    // Defaults to the active dashboard, but tracks the last arrow-key-navigated-to one from then on,
    // so tabbing away and back doesn't reset it.
    const [rovingDashboardId, setRovingDashboardId] = React.useState<string | null>(activeDashboardId);

    // Follows the active dashboard whenever that changes (e.g. clicking a tab)
    const [prevActiveDashboardId, setPrevActiveDashboardId] = React.useState(activeDashboardId);
    if (activeDashboardId !== prevActiveDashboardId) {
        setPrevActiveDashboardId(activeDashboardId);
        setRovingDashboardId(activeDashboardId);
    }

    // The stored tab stop can point at a removed dashboard (e.g. an inactive one navigated to with the
    // arrow keys, then deleted) - fall back to the active, then the first dashboard, so there's always one
    const tabStopDashboardId =
        [rovingDashboardId, activeDashboardId].find(
            (id) => id !== null && dashboards.some((dashboard) => dashboard.getId() === id),
        ) ??
        dashboards[0]?.getId() ??
        null;

    const getTabIndex = React.useCallback(
        function getTabIndex(dashboardId: string): 0 | -1 {
            return dashboardId === tabStopDashboardId ? 0 : -1;
        },
        [tabStopDashboardId],
    );

    const getTabStopElement = React.useCallback(
        function getTabStopElement(): HTMLElement | null {
            return contentRef.current?.querySelector<HTMLElement>('[data-dashboard-tab][tabindex="0"]') ?? null;
        },
        [contentRef],
    );

    // Removing the tab stop's dashboard (e.g. from its actions menu) loses focus - move it to the new tab
    // stop. Not if focus is elsewhere, e.g. in the delete confirmation dialog, which returns it itself.
    const prevTabStopDashboardIdRef = React.useRef(tabStopDashboardId);
    React.useEffect(
        function restoreFocusAfterTabStopRemoval() {
            const prevTabStopDashboardId = prevTabStopDashboardIdRef.current;
            prevTabStopDashboardIdRef.current = tabStopDashboardId;

            const wasRemoved =
                prevTabStopDashboardId !== null &&
                !dashboards.some((dashboard) => dashboard.getId() === prevTabStopDashboardId);
            const isFocusLost = document.activeElement === null || document.activeElement === document.body;
            if (wasRemoved && isFocusLost) {
                getTabStopElement()?.focus();
            }
        },
        [tabStopDashboardId, dashboards, getTabStopElement],
    );

    const onKeyDown = React.useCallback(
        function onKeyDown(event: React.KeyboardEvent) {
            if (dashboards.length === 0) {
                return;
            }
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
                return;
            }
            // Leave modified keys to the browser/OS, e.g. Alt+ArrowLeft for history back
            if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
                return;
            }

            // Only keys pressed on a tab itself - the strip also contains each tab's actions button,
            // and events from its menu bubble up here through the portal (e.g. Home/End in the menu)
            const currentId = event.target instanceof HTMLElement ? event.target.dataset.dashboardTab : undefined;
            if (currentId === undefined) {
                return;
            }

            const currentIndex = dashboards.findIndex((dashboard) => dashboard.getId() === currentId);
            const safeIndex = currentIndex === -1 ? 0 : currentIndex;

            let nextIndex = safeIndex;
            if (event.key === "ArrowLeft") {
                nextIndex = (safeIndex - 1 + dashboards.length) % dashboards.length;
            } else if (event.key === "ArrowRight") {
                nextIndex = (safeIndex + 1) % dashboards.length;
            } else if (event.key === "Home") {
                nextIndex = 0;
            } else if (event.key === "End") {
                nextIndex = dashboards.length - 1;
            }

            // Prevent the page from scrolling on Home/End/arrows - focusing the tab below scrolls it into view
            event.preventDefault();

            const nextDashboard = dashboards[nextIndex];
            setRovingDashboardId(nextDashboard.getId());

            // Move actual DOM focus, not just the internal roving-tabindex state - otherwise
            // Tab/Shift+Tab from here would still leave from wherever focus originally was, and the
            // newly-current tab wouldn't visibly show focus at all.
            const nextEl = contentRef.current?.querySelector<HTMLElement>(
                `[data-dashboard-tab="${CSS.escape(nextDashboard.getId())}"]`,
            );
            nextEl?.focus();
        },
        [dashboards, contentRef],
    );

    return { getTabIndex, getTabStopElement, onKeyDown };
}
