import React from "react";

import { GuiState } from "@framework/GuiMessageBroker";
import type { PrivateWorkbenchSession } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import type { Workbench } from "@framework/Workbench";

export type UseOptimisticActiveDashboardResult = {
    optimisticActiveDashboardId: string | null;
    selectDashboard: (dashboardId: string) => void;
};

// Switching dashboards runs synchronous work proportional to the outgoing/incoming dashboard's
// module count (tearing down and recreating module instances) - calling setActiveDashboard
// directly from the click handler blocks the tab bar's own re-render (which tab is highlighted)
// behind that work. optimisticActiveDashboardId lets the tab bar show the clicked tab as selected
// immediately, painting on this frame, while the actual (still fully synchronous) switch is
// deferred to the next frame via requestAnimationFrame. This is purely a GUI-layer responsiveness
// concern, kept out of the framework/session layer entirely.
export function useOptimisticActiveDashboard(
    workbench: Workbench,
    workbenchSession: PrivateWorkbenchSession,
): UseOptimisticActiveDashboardResult {
    const [optimisticActiveDashboardId, setOptimisticActiveDashboardId] = React.useState<string | null>(null);
    const latestRequestedDashboardIdRef = React.useRef<string | null>(null);

    const selectDashboard = React.useCallback(
        function selectDashboard(dashboardId: string) {
            latestRequestedDashboardIdRef.current = dashboardId;
            setOptimisticActiveDashboardId(dashboardId);
            // Set alongside the optimistic tab selection so both paint on this same frame, giving
            // the content area a chance to show a loading state covering the whole (unavoidably
            // blocking) switch that happens after the double rAF below.
            workbench.getGuiMessageBroker().setState(GuiState.IsSwitchingDashboard, true);
            // A single requestAnimationFrame runs BEFORE that frame's paint, not after - scheduling
            // the heavy work in just one rAF lands it in the exact same paint cycle as the tab
            // highlight/loading overlay update above, so that update never actually reaches the
            // screen before the freeze. Nesting rAF twice defers the heavy work to the frame AFTER
            // the one that paints this callback's own DOM changes, guaranteeing that paint has
            // already happened by the time the (still synchronous, blocking) switch runs.
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    // If another tab was clicked before this frame arrived, let that newer request
                    // win instead of switching to this now-stale one.
                    if (latestRequestedDashboardIdRef.current !== dashboardId) {
                        return;
                    }
                    workbenchSession.setActiveDashboard(dashboardId);
                    setOptimisticActiveDashboardId(null);
                    workbench.getGuiMessageBroker().setState(GuiState.IsSwitchingDashboard, false);
                });
            });
        },
        [workbenchSession, workbench],
    );

    return { optimisticActiveDashboardId, selectDashboard };
}
