import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import type { Workbench } from "@framework/Workbench";
import { Separator } from "@lib/components/Separator";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import { useActiveSession } from "../ActiveSessionBoundary";

import { DashboardSettingsToggle } from "./_panels/dashboardSettingsToggle";
import { StartPanel } from "./_panels/start";

export type ActionBarProps = {
    workbench: Workbench;
};

export function ActionBar(props: ActionBarProps) {
    const session = useActiveSession();
    const isSnapshot = usePublishSubscribeTopicValue(session, PrivateWorkbenchSessionTopic.IS_SNAPSHOT);

    if (isSnapshot) {
        return null;
    }

    return (
        <div className="border-b-neutral-subtle bg-surface/30 px-xs py-4xs shadow-elevation-raised flex border-b-2">
            <StartPanel workbench={props.workbench} />
            <Separator orientation="vertical" />
            <DashboardSettingsToggle workbench={props.workbench} />
        </div>
    );
}
