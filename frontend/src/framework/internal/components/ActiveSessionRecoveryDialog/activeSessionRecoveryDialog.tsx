import React from "react";

import { GuiState, useGuiState, useGuiValue } from "@framework/GuiMessageBroker";
import { loadWorkbenchSessionFromLocalStorage } from "@framework/internal/WorkbenchSession/utils/loaders";
import {
    extractLayout,
    type WorkbenchSessionDataContainer,
} from "@framework/internal/WorkbenchSession/utils/WorkbenchSessionDataContainer";
import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/newComponents/Button";
import { CircularProgress } from "@lib/newComponents/CircularProgress";
import { Dialog } from "@lib/newComponents/Dialog";
import { timeAgo } from "@lib/utils/dates";

import { useActiveSession } from "../ActiveSessionBoundary";
import { DashboardPreview } from "../DashboardPreview/dashboardPreview";

export type ActiveSessionRecoveryDialogProps = {
    workbench: Workbench;
};

export function ActiveSessionRecoveryDialog(props: ActiveSessionRecoveryDialogProps): React.ReactNode {
    const [isOpen, setIsOpen] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.ActiveSessionRecoveryDialogOpen,
    );

    const activeSession = useActiveSession();
    const isLoading = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.IsLoadingSession);

    const [sessionData, setSessionData] = React.useState<WorkbenchSessionDataContainer | null>(null);

    const loadSession = React.useCallback(
        async function loadSession() {
            try {
                const storedSession = loadWorkbenchSessionFromLocalStorage(activeSession.getId());
                setSessionData(storedSession);
            } catch {
                setSessionData(null);
            }
        },
        [activeSession],
    );

    React.useEffect(
        function loadSessionOnOpen() {
            if (isOpen) {
                loadSession();
            }
        },
        [isOpen, loadSession],
    );

    if (!isOpen || !sessionData) {
        return null;
    }

    function handleDiscard() {
        props.workbench.getSessionManager().discardLocalStorageSession(activeSession.getId(), false);
        setIsOpen(false);
    }

    function handleOpen() {
        props.workbench.getSessionManager().updateFromLocalStorage();
    }

    return (
        <Dialog.Popup open={isOpen} modal width={800}>
            <Dialog.Header>
                <Dialog.Title>Do you want to recover your session?</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body layoutClassName="flex flex-col gap-vertical-xs">
                We found an unsaved version of your current session in your local storage. You can either delete or
                recover it.
                <div className="gap-horizontal-sm flex">
                    <DashboardPreview height={150} width={150} layout={extractLayout(sessionData)} />
                    <div className="gap-vertical-xs flex flex-col">
                        <div className="gap-vertical-3xs flex flex-col">
                            <strong className="text-body-xs text-neutral-subtle">Title</strong>
                            {sessionData.metadata.title}
                        </div>
                        <div className="gap-vertical-3xs flex flex-col">
                            <strong className="text-body-xs text-neutral-subtle">Last modified</strong>
                            {timeAgo(Date.now() - sessionData.metadata.lastModifiedMs)}
                        </div>
                        <div className="gap-vertical-3xs flex flex-col">
                            <strong className="text-body-xs text-neutral-subtle">Last persisted</strong>
                            {timeAgo(Date.now() - activeSession.getMetadata().lastModifiedMs)}
                        </div>
                    </div>
                </div>
            </Dialog.Body>
            <Dialog.Actions>
                <Button onClick={handleDiscard} variant="text" tone="danger" disabled={isLoading}>
                    Delete session
                </Button>
                <Button onClick={handleOpen} variant="contained" disabled={isLoading}>
                    {isLoading && <CircularProgress size={16} />}
                    Recover session
                </Button>
            </Dialog.Actions>
        </Dialog.Popup>
    );
}
