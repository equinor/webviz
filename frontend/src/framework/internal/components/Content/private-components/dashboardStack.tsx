import React from "react";

import { useActiveSession } from "@framework/internal/components/ActiveSessionBoundary";
import { DashboardContext } from "@framework/internal/components/DashboardContext";
import type { Dashboard } from "@framework/internal/Dashboard";
import { DashboardHotCacheTopic } from "@framework/internal/WorkbenchSession/DashboardHotCache";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import type { Workbench } from "@framework/Workbench";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { Layout } from "./layout";

type DashboardStackProps = {
    workbench: Workbench;
};

/**
 * Renders every keep-alive dashboard's (active, plus whatever DashboardHotCache is holding, see
 * PrivateWorkbenchSession.setActiveDashboard) own full Layout - chrome, ViewWrapper, view content,
 * all of it - simultaneously, each in a fixed position in the tree for as long as it stays
 * keep-alive. Only the active one is visible and interactive; the rest are toggled to
 * display:none + pointer-events:none. display:none is used instead of visibility:hidden because
 * module content can set an explicit inline visibility on its own descendant nodes (e.g. canvas/SVG
 * elements), which would otherwise override an inherited visibility:hidden and paint through on top
 * of the active dashboard. display:none cannot be overridden this way. Switching dashboards is then
 * a pure CSS display swap with no mount/unmount, avoiding the WebGL/canvas reinitialization that both
 * a separate
 * "active vs hidden" tree branch and a portal-retargeting approach caused.
 */
export function DashboardStack(props: DashboardStackProps): React.ReactNode {
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
                <DashboardStackItem
                    key={dashboard.getId()}
                    dashboard={dashboard}
                    isActive={dashboard.getId() === activeDashboard?.getId()}
                    workbench={props.workbench}
                />
            ))}
        </>
    );
}

type DashboardStackItemProps = {
    dashboard: Dashboard;
    isActive: boolean;
    workbench: Workbench;
};

function DashboardStackItem(props: DashboardStackItemProps): React.ReactNode {
    const contextValue = React.useMemo(
        () => ({ dashboard: props.dashboard, isActive: props.isActive }),
        [props.dashboard, props.isActive],
    );

    return (
        <DashboardContext.Provider value={contextValue}>
            <div
                aria-hidden={!props.isActive}
                className={resolveClassNames("absolute inset-0 h-full w-full", {
                    hidden: !props.isActive,
                    "pointer-events-none": !props.isActive,
                })}
            >
                <Layout workbench={props.workbench} />
            </div>
        </DashboardContext.Provider>
    );
}
