import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import type { Workbench } from "@framework/Workbench";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import { useActiveSession } from "../ActiveSessionBoundary";

import { DashboardsPanel } from "./_panels/Dashboards/dashboardsPanel";

export type BottomBarProps = {
    workbench: Workbench;
};

export function BottomBar(props: BottomBarProps) {
    const session = useActiveSession();
    const isSnapshot = usePublishSubscribeTopicValue(session, PrivateWorkbenchSessionTopic.IS_SNAPSHOT);

    if (isSnapshot) {
        return null;
    }

    return (
        <div className="border-t-neutral-subtle bg-surface/30 shadow-elevation-raised flex border-t-2">
            <DashboardsPanel workbench={props.workbench} />
        </div>
    );
}
