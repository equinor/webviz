import React from "react";

import { GuiState } from "@framework/GuiMessageBroker";
import type { PrivateWorkbenchSession } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import { toastManager } from "@framework/toastManager";
import type { Workbench } from "@framework/Workbench";

export type UseOptimisticActiveDashboardResult = {
    optimisticActiveDashboardId: string | null;
    selectDashboard: (dashboardId: string) => void;
};

// Switching dashboards is synchronous and can be slow (module instances are torn down/created). To keep
// the tab strip responsive, the clicked tab is shown as selected right away (optimisticActiveDashboardId)
// and the actual switch is deferred until that has been painted.
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
            // Cancel a still pending switch from an earlier click - the ref only holds the latest frame ids,
            // so just overwriting them would leave that switch impossible to cancel (e.g. on unmount)
            if (pendingRafIdsRef.current.outer !== null) {
                cancelAnimationFrame(pendingRafIdsRef.current.outer);
            }
            if (pendingRafIdsRef.current.inner !== null) {
                cancelAnimationFrame(pendingRafIdsRef.current.inner);
            }

            function resetSelectionState() {
                setOptimisticActiveDashboardId(null);
                workbench.getGuiMessageBroker().setState(GuiState.IsSwitchingDashboard, false);
            }

            const activeDashboardIdAtRequest = workbenchSession.getActiveDashboard()?.getId() ?? null;

            // Already active - nothing to switch to (and no loading overlay to flash). Also drops a still
            // pending switch to another dashboard.
            if (dashboardId === activeDashboardIdAtRequest) {
                pendingRafIdsRef.current.outer = null;
                pendingRafIdsRef.current.inner = null;
                latestRequestedDashboardIdRef.current = null;
                resetSelectionState();
                return;
            }

            latestRequestedDashboardIdRef.current = dashboardId;
            setOptimisticActiveDashboardId(dashboardId);
            // Painted together with the tab selection, so a loading state covers the blocking switch below
            workbench.getGuiMessageBroker().setState(GuiState.IsSwitchingDashboard, true);
            // Two frames: a single one runs before that frame's paint, so the selection and loading state
            // would only show after the blocking switch
            pendingRafIdsRef.current.outer = requestAnimationFrame(function runOuterFrame() {
                pendingRafIdsRef.current.inner = requestAnimationFrame(function runInnerFrame() {
                    pendingRafIdsRef.current.outer = null;
                    pendingRafIdsRef.current.inner = null;
                    // A tab clicked since then wins
                    if (latestRequestedDashboardIdRef.current !== dashboardId) {
                        return;
                    }
                    // Switched by other means in the meantime, e.g. back/forward navigation - that wins
                    if ((workbenchSession.getActiveDashboard()?.getId() ?? null) !== activeDashboardIdAtRequest) {
                        latestRequestedDashboardIdRef.current = null;
                        resetSelectionState();
                        return;
                    }
                    try {
                        workbenchSession.setActiveDashboard(dashboardId);
                    } catch (error) {
                        // Caught here: escaping this rAF callback, it would be a window error, which the
                        // global error boundary treats as fatal
                        console.error(`Failed to switch to dashboard "${dashboardId}":`, error);
                        toastManager.add({ title: "Failed to switch dashboard", type: "error" });
                    } finally {
                        // Also after a failed switch, so the selection and loading state don't get stuck
                        resetSelectionState();
                    }
                });
            });
        },
        [workbenchSession, workbench],
    );

    // Cancels a pending switch on unmount, and when the session changes while this stays mounted (e.g.
    // save-as swapping it) - it would otherwise run against a torn-down session, and the optimistic
    // selection would linger
    React.useEffect(
        function cancelPendingSwitchOnSessionOrWorkbenchChange() {
            // The object is mutated in place, so the cleanup still sees the latest frame ids
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
