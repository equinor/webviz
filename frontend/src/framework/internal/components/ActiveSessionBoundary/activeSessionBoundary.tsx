import React from "react";

import type { PrivateWorkbenchSession } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import { WorkbenchTopic, type Workbench } from "@framework/Workbench";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

export const ActiveSessionContext = React.createContext<PrivateWorkbenchSession | null>(null);

export type ActiveSessionBoundaryProps = {
    children?: React.ReactNode;
    workbench: Workbench;
};

export function ActiveSessionBoundary(props: ActiveSessionBoundaryProps): React.ReactNode {
    const activeSession = usePublishSubscribeTopicValue(props.workbench, WorkbenchTopic.ACTIVE_SESSION);

    if (!activeSession) {
        return null;
    }

    return <ActiveSessionContext.Provider value={activeSession}>{props.children}</ActiveSessionContext.Provider>;
}

export function useActiveSession(): PrivateWorkbenchSession {
    const context = React.useContext(ActiveSessionContext);
    if (!context) {
        throw new Error("useActiveSession must be used within an ActiveSessionBoundary");
    }
    return context;
}
