import React from "react";

import { DashboardTopic } from "@framework/internal/Dashboard";
import { PersistenceOrchestratorTopic } from "@framework/internal/persistence/core/PersistenceOrchestrator";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import type { Workbench } from "@framework/Workbench";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import { useActiveDashboard } from "../ActiveDashboardBoundary";
import { useActiveSession } from "../ActiveSessionBoundary";

const DEFAULT_DOCUMENT_TITLE = "Webviz | FMU results visualization";
const FAVICON_HREF_DEFAULT = "/webviz-logo.svg";
const FAVICON_HREF_UNSAVED = "/webviz-logo-unsaved.svg";

function getFaviconLinkElement(): HTMLLinkElement | null {
    return document.querySelector<HTMLLinkElement>('link[rel="icon"]');
}

export type DocumentTitleSyncProps = {
    workbench: Workbench;
};

// Must be mounted within both an ActiveSessionBoundary and an ActiveDashboardBoundary.
export function DocumentTitleSync(props: DocumentTitleSyncProps): null {
    const activeSession = useActiveSession();
    const activeDashboard = useActiveDashboard();

    const sessionMetadata = usePublishSubscribeTopicValue(activeSession, PrivateWorkbenchSessionTopic.METADATA);
    const isSnapshot = usePublishSubscribeTopicValue(activeSession, PrivateWorkbenchSessionTopic.IS_SNAPSHOT);
    const isPersisted = usePublishSubscribeTopicValue(activeSession, PrivateWorkbenchSessionTopic.IS_PERSISTED);
    const dashboardMetadata = usePublishSubscribeTopicValue(activeDashboard, DashboardTopic.METADATA);
    const persistenceInfo = usePublishSubscribeTopicValue(
        props.workbench.getSessionManager().getPersistenceOrchestrator()!,
        PersistenceOrchestratorTopic.PERSISTENCE_INFO,
    );

    // Snapshots are read-only, so they're never dirty regardless of persistence state.
    const hasChanges =
        !isSnapshot && ((persistenceInfo.hasChanges && persistenceInfo.lastPersistedMs !== null) || !isPersisted);

    React.useEffect(
        function updateDocumentTitle() {
            const sessionTitle = isSnapshot ? `${sessionMetadata.title} (snapshot)` : sessionMetadata.title;
            document.title = `${dashboardMetadata.name} - ${sessionTitle} | Webviz`;
        },
        [dashboardMetadata.name, sessionMetadata.title, isSnapshot],
    );

    React.useEffect(
        function updateFavicon() {
            const link = getFaviconLinkElement();
            if (!link) {
                return;
            }
            link.href = hasChanges ? FAVICON_HREF_UNSAVED : FAVICON_HREF_DEFAULT;
        },
        [hasChanges],
    );

    // Restores the default title/favicon once no session/dashboard is active anymore, since the
    // boundaries this component lives in unmount it rather than passing null props.
    React.useEffect(function resetOnUnmount() {
        return () => {
            document.title = DEFAULT_DOCUMENT_TITLE;
            const link = getFaviconLinkElement();
            if (link) {
                link.href = FAVICON_HREF_DEFAULT;
            }
        };
    }, []);

    return null;
}
