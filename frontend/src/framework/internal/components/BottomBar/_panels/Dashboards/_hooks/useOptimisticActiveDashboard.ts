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
    const pendingRafIdsRef = React.useRef<{ outer: number | null; inner: number | null }>({
        outer: null,
        inner: null,
    });

    const selectDashboard = React.useCallback(
        function selectDashboard(dashboardId: string) {
            // Cancel any still-pending frame pair from an earlier, now-superseded click instead of
            // just overwriting the ref below - otherwise a rapid second click loses the only handle
            // on the first chain's frame ids (this ref is the sole record of them), and when that
            // first chain's own inner frame later fires it nulls out what are by then the SECOND
            // chain's ids (both chains share this one ref), so an unmount landing between the two
            // inner frames sees nothing pending and skips cancelling the second chain's still-live
            // rAF - which then fires after unmount and calls into a session that may already be torn
            // down.
            if (pendingRafIdsRef.current.outer !== null) {
                cancelAnimationFrame(pendingRafIdsRef.current.outer);
            }
            if (pendingRafIdsRef.current.inner !== null) {
                cancelAnimationFrame(pendingRafIdsRef.current.inner);
            }

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
            pendingRafIdsRef.current.outer = requestAnimationFrame(function runOuterFrame() {
                pendingRafIdsRef.current.inner = requestAnimationFrame(function runInnerFrame() {
                    pendingRafIdsRef.current.outer = null;
                    pendingRafIdsRef.current.inner = null;
                    // If another tab was clicked before this frame arrived, let that newer request
                    // win instead of switching to this now-stale one.
                    if (latestRequestedDashboardIdRef.current !== dashboardId) {
                        return;
                    }
                    try {
                        workbenchSession.setActiveDashboard(dashboardId);
                    } finally {
                        // Runs even if setActiveDashboard throws (e.g. while lazily loading the
                        // dashboard) - otherwise a failed switch would leave the tab selection
                        // optimistic and the loading overlay up forever.
                        setOptimisticActiveDashboardId(null);
                        workbench.getGuiMessageBroker().setState(GuiState.IsSwitchingDashboard, false);
                    }
                });
            });
        },
        [workbenchSession, workbench],
    );

    // The rAF pair above outlives this hook if the panel unmounts mid-switch (e.g. the bottom bar
    // panel is closed while the frames are still pending), or if workbenchSession itself changes
    // while this hook's component stays mounted (ActiveSessionBoundary reuses its descendants across
    // a session swap, e.g. save-as replacing the active session with a new instance) - either way,
    // depending on both lets the cleanup below fire whenever either identity changes, not just on
    // unmount. Without this, a frame scheduled against the old session would still fire after the
    // swap - calling setActiveDashboard on a session that may already be torn down - and the old
    // optimistic id would keep showing as selected in the new session's tab strip since nothing ever
    // clears it.
    React.useEffect(
        function cancelPendingSwitchOnSessionOrWorkbenchChange() {
            // Captured once per effect run (not read fresh inside the returned cleanup) so the
            // cleanup always operates on the same {outer, inner} container this effect run observed -
            // it's a stable object reference whose fields are mutated in place, so this still sees
            // whatever the latest values are by the time cleanup runs.
            const pendingRafIds = pendingRafIdsRef.current;
            return function cancelPendingFramesAndResetState() {
                if (pendingRafIds.outer !== null) {
                    cancelAnimationFrame(pendingRafIds.outer);
                    pendingRafIds.outer = null;
                }
                if (pendingRafIds.inner !== null) {
                    cancelAnimationFrame(pendingRafIds.inner);
                    pendingRafIds.inner = null;
                }
                latestRequestedDashboardIdRef.current = null;
                setOptimisticActiveDashboardId(null);
                workbench.getGuiMessageBroker().setState(GuiState.IsSwitchingDashboard, false);
            };
        },
        [workbench, workbenchSession],
    );

    return { optimisticActiveDashboardId, selectDashboard };
}
