import React from "react";

import type { Dashboard } from "@framework/internal/Dashboard";
import type { UseHorizontalStepScrollResult } from "@lib/hooks/useHorizontalStepScroll";
import { useHorizontalStepScroll } from "@lib/hooks/useHorizontalStepScroll";

export type UseDashboardTabStripScrollResult = UseHorizontalStepScrollResult;

// Owns the horizontal scroll behaviour of the dashboard tab strip. Thin wrapper around the generic
// useHorizontalStepScroll: the tabs are base-ui's [role="tab"] elements, and every reorder needs an
// extra render so <Tabs.Indicator/> (the active-tab underline) gets a post-commit chance to
// remeasure - its own ResizeObserver never fires for a pure reorder of same-sized tabs.
//
// Key off the *ordered id sequence*, not `dashboards` itself: PrivateWorkbenchSession.moveDashboard()
// reorders the underlying array in place (splice), it never replaces it, so the array reference stays
// identical across a reorder and would never register as a changed dependency.
export function useDashboardTabStripScroll(dashboards: Dashboard[]): UseDashboardTabStripScrollResult {
    const [, forceIndicatorRemeasure] = React.useReducer((count: number) => count + 1, 0);

    return useHorizontalStepScroll({
        itemSelector: '[role="tab"]',
        itemsKey: dashboards.map((dashboard) => dashboard.getId()).join("|"),
        onItemsChange: forceIndicatorRemeasure,
    });
}
