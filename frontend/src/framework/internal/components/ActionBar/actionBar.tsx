import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import type { Workbench } from "@framework/Workbench";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import { useActiveSession } from "../ActiveSessionBoundary";

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
        <div className="border-b-neutral-subtle bg-surface/30 px-xs py-3xs shadow-elevation-raised flex border-b-2">
            <StartPanel workbench={props.workbench} />
        </div>
    );
}
