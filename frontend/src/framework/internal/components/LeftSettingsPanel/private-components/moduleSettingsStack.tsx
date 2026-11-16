import React from "react";

import { useActiveSession } from "@framework/internal/components/ActiveSessionBoundary";
import { DashboardContext } from "@framework/internal/components/DashboardContext";
import type { Dashboard } from "@framework/internal/Dashboard";
import { DashboardTopic } from "@framework/internal/Dashboard";
import { useKeepAliveDashboardIds } from "@framework/internal/hooks/useKeepAliveDashboardIds";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import type { Workbench } from "@framework/Workbench";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import { ModuleSettings } from "./moduleSettings";

type ModuleSettingsStackProps = {
    workbench: Workbench;
};

/**
 * Renders ModuleSettings for every keep-alive dashboard's (active, plus whatever DashboardHotCache is
 * holding) modules simultaneously.
 */
export function ModuleSettingsStack(props: ModuleSettingsStackProps): React.ReactNode {
    const workbenchSession = useActiveSession();
    const activeDashboard = usePublishSubscribeTopicValue(
        workbenchSession,
        PrivateWorkbenchSessionTopic.ACTIVE_DASHBOARD,
    );
    const keepAliveIds = useKeepAliveDashboardIds(workbenchSession);
    const keepAliveDashboards = workbenchSession
        .getDashboards()
        .filter((dashboard) => keepAliveIds.has(dashboard.getId()));

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
