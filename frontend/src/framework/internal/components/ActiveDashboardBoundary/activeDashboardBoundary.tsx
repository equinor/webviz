import React from "react";

import type { Dashboard } from "@framework/internal/Dashboard";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import { useActiveSession } from "../ActiveSessionBoundary/activeSessionBoundary";

export const ActiveDashboardContext = React.createContext<Dashboard | null>(null);

export type ActiveDashboardBoundaryProps = {
    children?: React.ReactNode;
};

export function ActiveDashboardBoundary(props: ActiveDashboardBoundaryProps): React.ReactNode {
    const activeSession = useActiveSession();

    const activeDashboard = usePublishSubscribeTopicValue(activeSession, PrivateWorkbenchSessionTopic.ACTIVE_DASHBOARD);

    if (!activeDashboard) {
        return null;
    }

    return <ActiveDashboardContext.Provider value={activeDashboard}>{props.children}</ActiveDashboardContext.Provider>;
}

export function useActiveDashboard(): Dashboard {
    const dashboard = React.useContext(ActiveDashboardContext);
    if (!dashboard) {
        throw new Error("useActiveDashboard must be used within an ActiveDashboardBoundary");
    }
    return dashboard;
}
