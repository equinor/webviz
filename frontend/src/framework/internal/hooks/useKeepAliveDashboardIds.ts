import { DashboardHotCacheTopic } from "@framework/internal/WorkbenchSession/DashboardHotCache";
import type { PrivateWorkbenchSession } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

/**
 * The set of dashboard ids that should stay mounted right now: the active dashboard, plus whatever
 * DashboardHotCache is holding onto after a switch away (see its own docs). Shared by every place
 * that needs to know "every dashboard that should stay alive" - keeping a dashboard's module
 * instances and atom stores mounted while hot avoids paying their full teardown/recreate cost
 * (WebGL context included) on every switch.
 */
export function useKeepAliveDashboardIds(workbenchSession: PrivateWorkbenchSession): Set<string> {
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
    return keepAliveIds;
}
