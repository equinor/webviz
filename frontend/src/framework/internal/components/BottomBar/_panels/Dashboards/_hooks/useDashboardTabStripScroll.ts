import React from "react";

import type { Dashboard } from "@framework/internal/Dashboard";
import type { UseHorizontalStepScrollResult } from "@lib/hooks/useHorizontalStepScroll";
import { useHorizontalStepScroll } from "@lib/hooks/useHorizontalStepScroll";

export type UseDashboardTabStripScrollResult = UseHorizontalStepScrollResult;

// Owns the horizontal scroll behaviour of the dashboard tab strip. Thin wrapper around the generic
// useHorizontalStepScroll, keyed off the ordered id sequence so item additions, removals, and
// reorders are represented directly in the dependency passed to it.
//
// activeDashboardId should be the optimistic-or-actual selection (see useOptimisticActiveDashboard) -
// whichever tab is highlighted is the one that gets scrolled into view, so a rapid click still scrolls
// immediately instead of waiting for the (deferred) real switch to land.
export function useDashboardTabStripScroll(
    dashboards: Dashboard[],
    activeDashboardId: string | null,
): UseDashboardTabStripScrollResult {
    const result = useHorizontalStepScroll({
        itemSelector: "[data-dashboard-tab]",
        itemsKey: dashboards.map((dashboard) => dashboard.getId()).join("|"),
    });

    const { scrollItemIntoView } = result;

    // Covers every way the selected tab can end up off-screen: picking an appended/cloned dashboard
    // while the strip overflows, switching tabs generally, and the initial mount (e.g. a deep-linked
    // session/snapshot opening onto a dashboard further down the list than fits in view).
    React.useEffect(
        function keepActiveTabInView() {
            if (activeDashboardId === null) {
                return;
            }
            const index = dashboards.findIndex((dashboard) => dashboard.getId() === activeDashboardId);
            if (index === -1) {
                return;
            }
            scrollItemIntoView(index);
        },
        [activeDashboardId, dashboards, scrollItemIntoView],
    );

    return result;
}
