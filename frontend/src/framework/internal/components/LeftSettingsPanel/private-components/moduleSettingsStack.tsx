import React from "react";

import { useActiveSession } from "@framework/internal/components/ActiveSessionBoundary";
import { DashboardContext } from "@framework/internal/components/DashboardContext";
import type { Dashboard } from "@framework/internal/Dashboard";
import { DashboardTopic } from "@framework/internal/Dashboard";
import { DashboardHotCacheTopic } from "@framework/internal/WorkbenchSession/DashboardHotCache";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import type { Workbench } from "@framework/Workbench";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import { ModuleSettings } from "./moduleSettings";

type ModuleSettingsStackProps = {
    workbench: Workbench;
};

/**
 * Mirrors DashboardStack (see Content/private-components/dashboardStack.tsx): renders
 * ModuleSettings for every keep-alive dashboard's (active, plus whatever DashboardHotCache is
 * holding) modules simultaneously, instead of only the active dashboard's. Each module's settings
 * component owns a per-module-instance DataProviderManager (see usePersistedDataProviderManager)
 * that the corresponding view reads via a shared atom store - unmounting settings when switching
 * to a hot-but-inactive dashboard would tear that manager down and force the view to reinitialize
 * (e.g. recreate its WebGL/deck.gl instance) the next time the dashboard becomes active again.
 * Keeping settings mounted here, gated only by CSS visibility, avoids that.
 */
export function ModuleSettingsStack(props: ModuleSettingsStackProps): React.ReactNode {
    const workbenchSession = useActiveSession();
    const activeDashboard = usePublishSubscribeTopicValue(workbenchSession, PrivateWorkbenchSessionTopic.ACTIVE_DASHBOARD);
    const hotDashboardIds = usePublishSubscribeTopicValue(
        workbenchSession.getDashboardHotCache(),
        DashboardHotCacheTopic.HOT_DASHBOARD_IDS,
    );

    const keepAliveIds = new Set(hotDashboardIds);
    if (activeDashboard) {
        keepAliveIds.add(activeDashboard.getId());
    }
    const keepAliveDashboards = workbenchSession.getDashboards().filter((dashboard) => keepAliveIds.has(dashboard.getId()));

    return (
        <>
            {keepAliveDashboards.map((dashboard) => (
                <DashboardModuleSettingsGroup
                    key={dashboard.getId()}
                    dashboard={dashboard}
                    isActive={dashboard.getId() === activeDashboard?.getId()}
                    workbench={props.workbench}
                />
            ))}
        </>
    );
}

type DashboardModuleSettingsGroupProps = {
    dashboard: Dashboard;
    isActive: boolean;
    workbench: Workbench;
};

function DashboardModuleSettingsGroup(props: DashboardModuleSettingsGroupProps): React.ReactNode {
    const moduleInstances = usePublishSubscribeTopicValue(props.dashboard, DashboardTopic.MODULE_INSTANCES);
    const contextValue = React.useMemo(
        () => ({ dashboard: props.dashboard, isActive: props.isActive }),
        [props.dashboard, props.isActive],
    );

    return (
        <DashboardContext.Provider value={contextValue}>
            {moduleInstances.map((instance) => (
                <ModuleSettings key={instance.getId()} workbench={props.workbench} moduleInstance={instance} />
            ))}
        </DashboardContext.Provider>
    );
}
