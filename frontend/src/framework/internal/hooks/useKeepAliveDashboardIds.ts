import { DashboardHotCacheTopic } from "@framework/internal/WorkbenchSession/DashboardHotCache";
import type { PrivateWorkbenchSession } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

/**
 * Ids of the dashboards that should stay mounted: the active one plus the hot ones (see DashboardHotCache).
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
