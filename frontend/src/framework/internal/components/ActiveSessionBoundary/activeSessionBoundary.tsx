import { WorkbenchTopic, type Workbench } from "@framework/Workbench";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

export type ActiveSessionBoundaryProps = {
    children?: React.ReactNode;
    workbench: Workbench;
};

export function ActiveSessionBoundary(props: ActiveSessionBoundaryProps): React.ReactNode {
    const hasActiveSession = usePublishSubscribeTopicValue(props.workbench, WorkbenchTopic.HAS_ACTIVE_SESSION);

    if (!hasActiveSession) {
        return null;
    }

    return props.children;
}
