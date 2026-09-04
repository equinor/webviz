import React from "react";

import type { Dashboard } from "@framework/internal/Dashboard";

/**
 * The dashboard that the current part of a keep-alive-aware stack (see DashboardStack in
 * Content, and the analogous stack in LeftSettingsPanel) renders, plus whether it is the
 * session's currently active (visible, interactive) dashboard - not necessarily true, since
 * hot-but-inactive dashboards (see DashboardHotCache) stay mounted here too. Distinct from
 * ActiveDashboardContext, which always refers to the one true active dashboard for consumers
 * outside those stacks (document title, sync settings, module log, etc.).
 *
 * `isActive` lets components inside a stack (Layout's drag-and-drop handling,
 * ChannelReceiverNodesWrapper's data-channel-connect handling, ModuleSettings' visibility, ...)
 * opt out of reacting to global GuiEvents - or of ever being shown - when they belong to a
 * dashboard that isn't currently visible: those events/UI states only ever apply to the active
 * dashboard, but every keep-alive dashboard's subtree is mounted simultaneously, so without this
 * check every one of them would react/show.
 */
export type DashboardContextValue = {
    dashboard: Dashboard;
    isActive: boolean;
};

export const DashboardContext = React.createContext<DashboardContextValue | null>(null);

export function useDashboard(): DashboardContextValue {
    const value = React.useContext(DashboardContext);
    if (!value) {
        throw new Error("useDashboard must be used within a DashboardContext.Provider");
    }
    return value;
}
