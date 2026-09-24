import React from "react";

import type { Dashboard } from "@framework/internal/Dashboard";

export type UseDashboardTabRovingFocusResult = {
    /** tabIndex for a given dashboard's select button - exactly one dashboard ever gets 0. */
    getTabIndex: (dashboardId: string) => 0 | -1;
    /** Attach to the tab strip container. */
    onKeyDown: (event: React.KeyboardEvent) => void;
};

// Arrow-key navigation for the dashboard tab strip, replacing what base-ui's Tabs.Root gave for
// free before this strip moved off it (see DashboardTab's own comment for why). Follows the
// standard roving-tabindex pattern: exactly one tab is ever part of the page's normal Tab-key
// order (tabIndex=0), everything else is tabIndex=-1, and Left/Right/Home/End move both DOM focus
// and that single tab-stop directly, without going through Tab-key order at all.
//
// Uses "automatic activation" - moving to a tab selects it immediately - matching base-ui's own
// default, which is what this strip's keyboard behaviour looked like before the rewrite.
// selectDashboard() already coalesces rapid repeated calls (see useOptimisticActiveDashboard), so
// holding an arrow key down is safe.
export function useDashboardTabRovingFocus(
    dashboards: Dashboard[],
    activeDashboardId: string | null,
    onSelect: (dashboardId: string) => void,
    contentRef: React.RefObject<HTMLDivElement>,
): UseDashboardTabRovingFocusResult {
    // Defaults to the active dashboard, but tracks the last arrow-key-navigated-to one from then on,
    // so tabbing away and back doesn't reset it.
    const [rovingDashboardId, setRovingDashboardId] = React.useState<string | null>(activeDashboardId);

    // Keeps the roving tab-stop in sync whenever the active dashboard changes for a reason other
    // than arrow-key navigation here (clicking a different tab, adding/removing dashboards) - it
    // should follow the active one rather than keep pointing at a dashboard that's no longer active
    // or no longer exists.
    const [prevActiveDashboardId, setPrevActiveDashboardId] = React.useState(activeDashboardId);
    if (activeDashboardId !== prevActiveDashboardId) {
        setPrevActiveDashboardId(activeDashboardId);
        setRovingDashboardId(activeDashboardId);
    }

    const getTabIndex = React.useCallback(
        function getTabIndex(dashboardId: string): 0 | -1 {
            const rovingId = rovingDashboardId ?? dashboards[0]?.getId() ?? null;
            return dashboardId === rovingId ? 0 : -1;
        },
        [rovingDashboardId, dashboards],
    );

    const onKeyDown = React.useCallback(
        function onKeyDown(event: React.KeyboardEvent) {
            if (dashboards.length === 0) {
                return;
            }
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
                return;
            }

            const currentId = rovingDashboardId ?? dashboards[0].getId();
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

            // Prevent the page from scrolling on Home/End/arrows - the tab strip itself already
            // scrolls the newly-current tab into view (via the same mechanism the click path uses).
            event.preventDefault();

            const nextDashboard = dashboards[nextIndex];
            setRovingDashboardId(nextDashboard.getId());
            onSelect(nextDashboard.getId());

            // Move actual DOM focus, not just the internal roving-tabindex state - otherwise
            // Tab/Shift+Tab from here would still leave from wherever focus originally was, and the
            // newly-current tab wouldn't visibly show focus at all.
            const nextEl = contentRef.current?.querySelector<HTMLElement>(
                `[data-dashboard-tab="${CSS.escape(nextDashboard.getId())}"]`,
            );
            nextEl?.focus();
        },
        [dashboards, rovingDashboardId, onSelect, contentRef],
    );

    return { getTabIndex, onKeyDown };
}
