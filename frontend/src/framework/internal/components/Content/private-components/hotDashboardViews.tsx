import React from "react";

import type { Dashboard } from "@framework/internal/Dashboard";
import { DashboardTopic } from "@framework/internal/Dashboard";
import { DashboardHotCacheTopic } from "@framework/internal/WorkbenchSession/DashboardHotCache";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import type { Workbench } from "@framework/Workbench";
import { useElementSize } from "@lib/hooks/useElementSize";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import { useActiveSession } from "../../ActiveSessionBoundary";

type HotDashboardViewsProps = {
    workbench: Workbench;
};

/**
 * For every hot (recently-deactivated but not yet evicted, see DashboardHotCache) dashboard,
 * renders a hidden slot per module instance for ModuleViewContentHost to portal that module's view
 * content into - keeping it mounted (WebGL canvas/context intact) in the background instead of
 * being torn down, without needing any of ViewWrapper's chrome (header, drag-and-drop, active-module
 * outline), which only matters for the dashboard the user can actually see. That chrome, plus its
 * own slot registration, is still owned solely by Layout for the active dashboard.
 */
export function HotDashboardViews(props: HotDashboardViewsProps): React.ReactNode {
    const workbenchSession = useActiveSession();
    const activeDashboard = usePublishSubscribeTopicValue(
        workbenchSession,
        PrivateWorkbenchSessionTopic.ACTIVE_DASHBOARD,
    );
    const hotDashboardIds = usePublishSubscribeTopicValue(
        workbenchSession.getDashboardHotCache(),
        DashboardHotCacheTopic.HOT_DASHBOARD_IDS,
    );

    const hiddenHotDashboards = workbenchSession
        .getDashboards()
        .filter((dashboard) => dashboard.getId() !== activeDashboard?.getId() && hotDashboardIds.includes(dashboard.getId()));

    return (
        <>
            {hiddenHotDashboards.map((dashboard) => (
                <HiddenDashboardSlots key={dashboard.getId()} dashboard={dashboard} workbench={props.workbench} />
            ))}
        </>
    );
}

type HiddenDashboardSlotsProps = {
    dashboard: Dashboard;
    workbench: Workbench;
};

function HiddenDashboardSlots(props: HiddenDashboardSlotsProps): React.ReactNode {
    const ref = React.useRef<HTMLDivElement>(null);
    // visibility:hidden (not display:none) so the container keeps real layout dimensions - a
    // display:none ancestor can be unreliable for WebGL canvases across browsers, and
    // useElementSize's own visibility check (offsetWidth/offsetHeight/getClientRects) treats a
    // zero-size (display:none) element as hidden and stops reporting size updates for it.
    const size = useElementSize(ref);
    const moduleInstances = usePublishSubscribeTopicValue(props.dashboard, DashboardTopic.MODULE_INSTANCES);
    const layout = usePublishSubscribeTopicValue(props.dashboard, DashboardTopic.LAYOUT);
    const registry = props.workbench.getModuleViewSlotRegistry();

    return (
        <div ref={ref} aria-hidden className="invisible pointer-events-none fixed inset-0 -z-10">
            {moduleInstances.map((instance) => {
                const layoutElement = layout.find((element) => element.moduleInstanceId === instance.getId());
                if (!layoutElement) {
                    return null;
                }
                return (
                    <div
                        key={instance.getId()}
                        ref={(el) => registry.setSlot(instance.getId(), el)}
                        className="absolute box-border"
                        style={{
                            width: Math.round(layoutElement.relWidth * size.width),
                            height: Math.round(layoutElement.relHeight * size.height),
                            left: Math.round(layoutElement.relX * size.width),
                            top: Math.round(layoutElement.relY * size.height),
                        }}
                    />
                );
            })}
        </div>
    );
}
