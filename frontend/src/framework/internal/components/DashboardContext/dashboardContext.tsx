import React from "react";

import type { Dashboard } from "@framework/internal/Dashboard";

/**
 * The dashboard rendered by this part of a keep-alive stack (DashboardStack, and the one in
 * LeftSettingsPanel), which can be a hot but inactive one - unlike ActiveDashboardContext.
 *
 * Every keep-alive dashboard is mounted at once, so components that react to global GuiEvents or show
 * UI should check `isActive` - otherwise all of them would react.
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
