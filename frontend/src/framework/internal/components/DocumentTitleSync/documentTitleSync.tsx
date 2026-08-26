import React from "react";

import type { PersistenceOrchestrator } from "@framework/internal/persistence/core/PersistenceOrchestrator";
import { PersistenceOrchestratorTopic } from "@framework/internal/persistence/core/PersistenceOrchestrator";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import type { Workbench } from "@framework/Workbench";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import { useActiveSession } from "../ActiveSessionBoundary";

const DEFAULT_DOCUMENT_TITLE = "Webviz | FMU results visualization";
const FAVICON_HREF_DEFAULT = "/webviz-logo.svg";
const FAVICON_HREF_UNSAVED = "/webviz-logo-unsaved.svg";
const FAVICON_HREF_SNAPSHOT = "/webviz-logo-snapshot.svg";

function getFaviconLinkElement(): HTMLLinkElement | null {
    return document.querySelector<HTMLLinkElement>('link[rel="icon"]');
}

function useDocumentTitleAndFaviconSync(sessionTitle: string, faviconHref: string): void {
    React.useEffect(
        function updateDocumentTitle() {
            document.title = `${sessionTitle} | Webviz`;
        },
        [sessionTitle],
    );

    React.useEffect(
        function updateFavicon() {
            const link = getFaviconLinkElement();
            if (!link) {
                return;
            }
            link.href = faviconHref;
        },
        [faviconHref],
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
}

export type DocumentTitleSyncProps = {
    workbench: Workbench;
};

// Must be mounted within both an ActiveSessionBoundary and an ActiveDashboardBoundary.
// Snapshots have no persistence orchestrator (they're read-only and never persisted), so this
// dispatches to a dedicated component that skips subscribing to persistence info entirely,
// rather than conditionally handling a null orchestrator inside a single hook chain.
// Branches on the IS_SNAPSHOT topic (rather than reading getPersistenceOrchestrator() directly)
// so converting a snapshot to a session re-renders this and picks up the newly created orchestrator.
export function DocumentTitleSync(props: DocumentTitleSyncProps): React.ReactNode {
    const activeSession = useActiveSession();
    const isSnapshot = usePublishSubscribeTopicValue(activeSession, PrivateWorkbenchSessionTopic.IS_SNAPSHOT);

    if (isSnapshot) {
        return <SnapshotDocumentTitleSync />;
    }

    const persistenceOrchestrator = props.workbench.getSessionManager().getPersistenceOrchestrator();
    if (!persistenceOrchestrator) {
        throw new Error(
            "Expected a persistence orchestrator for a non-snapshot session. This should not happen and indicates a logic error.",
        );
    }

    return <SessionDocumentTitleSync persistenceOrchestrator={persistenceOrchestrator} />;
}

function SnapshotDocumentTitleSync(): null {
    const activeSession = useActiveSession();
    const sessionMetadata = usePublishSubscribeTopicValue(activeSession, PrivateWorkbenchSessionTopic.METADATA);

    useDocumentTitleAndFaviconSync(`${sessionMetadata.title} (snapshot)`, FAVICON_HREF_SNAPSHOT);

    return null;
}

type SessionDocumentTitleSyncProps = {
    persistenceOrchestrator: PersistenceOrchestrator;
};

function SessionDocumentTitleSync(props: SessionDocumentTitleSyncProps): null {
    const activeSession = useActiveSession();
    const sessionMetadata = usePublishSubscribeTopicValue(activeSession, PrivateWorkbenchSessionTopic.METADATA);
    const isPersisted = usePublishSubscribeTopicValue(activeSession, PrivateWorkbenchSessionTopic.IS_PERSISTED);
    const persistenceInfo = usePublishSubscribeTopicValue(
        props.persistenceOrchestrator,
        PersistenceOrchestratorTopic.PERSISTENCE_INFO,
    );

    const hasChanges = (persistenceInfo.hasChanges && persistenceInfo.lastPersistedMs !== null) || !isPersisted;

    useDocumentTitleAndFaviconSync(sessionMetadata.title, hasChanges ? FAVICON_HREF_UNSAVED : FAVICON_HREF_DEFAULT);

    return null;
}
