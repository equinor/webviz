import type React from "react";

import ReactDOM from "react-dom";

import type { Dashboard } from "@framework/internal/Dashboard";
import { DashboardTopic } from "@framework/internal/Dashboard";
import { DashboardHotCacheTopic } from "@framework/internal/WorkbenchSession/DashboardHotCache";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import type { ModuleInstance } from "@framework/ModuleInstance";
import type { Workbench } from "@framework/Workbench";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import { useActiveSession } from "../../ActiveSessionBoundary";

import { ViewContent } from "./ViewWrapper/private-components/viewContent";

type ModuleViewContentHostProps = {
    workbench: Workbench;
};

/**
 * Stable owner of every kept-alive (active or hot, see DashboardHotCache) dashboard's module view
 * content. Rendered once, at a fixed position in the tree, independent of which dashboard is
 * currently active - so a module's ViewContent (and any WebGL canvas/context it owns) is never
 * unmounted just because its dashboard stops being the active one. ViewWrapper's chrome (header,
 * positioning) can still be freely remounted between the active Layout and the hidden renderer;
 * only the portal target each module's ViewContent renders into changes, via ModuleViewSlotRegistry.
 */
export function ModuleViewContentHost(props: ModuleViewContentHostProps): React.ReactNode {
    const workbenchSession = useActiveSession();
    const activeDashboard = usePublishSubscribeTopicValue(
        workbenchSession,
        PrivateWorkbenchSessionTopic.ACTIVE_DASHBOARD,
    );
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
                <DashboardModuleContentPortals key={dashboard.getId()} dashboard={dashboard} workbench={props.workbench} />
            ))}
        </>
    );
}

type DashboardModuleContentPortalsProps = {
    dashboard: Dashboard;
    workbench: Workbench;
};

function DashboardModuleContentPortals(props: DashboardModuleContentPortalsProps): React.ReactNode {
    const moduleInstances = usePublishSubscribeTopicValue(props.dashboard, DashboardTopic.MODULE_INSTANCES);

    return (
        <>
            {moduleInstances.map((instance) => (
                <ModuleViewContentPortal key={instance.getId()} moduleInstance={instance} workbench={props.workbench} />
            ))}
        </>
    );
}

type ModuleViewContentPortalProps = {
    moduleInstance: ModuleInstance<any, any>;
    workbench: Workbench;
};

function ModuleViewContentPortal(props: ModuleViewContentPortalProps): React.ReactNode {
    const registry = props.workbench.getModuleViewSlotRegistry();
    const slotElement = usePublishSubscribeTopicValue(registry, props.moduleInstance.getId());

    if (!slotElement) {
        return null;
    }

    return ReactDOM.createPortal(
        <ViewContent workbench={props.workbench} moduleInstance={props.moduleInstance} />,
        slotElement,
    );
}
