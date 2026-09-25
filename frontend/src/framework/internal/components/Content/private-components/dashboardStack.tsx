import React from "react";

import { useActiveSession } from "@framework/internal/components/ActiveSessionBoundary";
import { DashboardContext } from "@framework/internal/components/DashboardContext";
import type { Dashboard } from "@framework/internal/Dashboard";
import { useKeepAliveDashboardIds } from "@framework/internal/hooks/useKeepAliveDashboardIds";
import { makeDashboardTabId, makeDashboardTabPanelId } from "@framework/internal/utils/dashboardAriaIds";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import type { Workbench } from "@framework/Workbench";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { Layout } from "./layout";

type DashboardStackProps = {
    workbench: Workbench;
};

/**
 * Renders the full layout of every keep-alive dashboard (the active one plus the hot ones) at a fixed
 * place in the tree, so switching is a CSS display swap - no remount, no WebGL/canvas reinitialization.
 * Inactive ones get display:none rather than visibility:hidden, which module content can override on
 * its own elements (e.g. canvas/SVG) and so paint through.
 */
export function DashboardStack(props: DashboardStackProps): React.ReactNode {
    const workbenchSession = useActiveSession();
    const activeDashboard = usePublishSubscribeTopicValue(workbenchSession, PrivateWorkbenchSessionTopic.ACTIVE_DASHBOARD);
    const keepAliveIds = useKeepAliveDashboardIds(workbenchSession);
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
                id={makeDashboardTabPanelId(props.dashboard.getId())}
                role="tabpanel"
                aria-labelledby={makeDashboardTabId(props.dashboard.getId())}
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
