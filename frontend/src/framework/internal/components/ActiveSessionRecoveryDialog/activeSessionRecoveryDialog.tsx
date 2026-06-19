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
import { AlertDialog } from "@lib/newComponents/AlertDialog";

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
        <AlertDialog
            open={isOpen}
            onOpenChange={setIsOpen}
            title="Do you want to recover your previous session?"
            primaryAction={{ label: "Recover session", onClick: handleOpen }}
            secondaryActions={[{ label: "Delete session", onClick: handleDiscard, tone: "danger" }]}
        >
            <div className="gap-y-sm flex flex-col">
                We found an unsaved version of your current session in your browser. You can either delete or recover
                it.
                <div className="gap-x-sm flex">
                    <DashboardPreview height={150} width={150} layout={extractLayout(sessionData)} />
                    <div className="gap-y-xs flex flex-col">
                        <div className="gap-y-4xs flex flex-col">
                            <strong className="text-body-xs text-neutral-subtle">Title</strong>
                            {sessionData.metadata.title}
                        </div>
                        <div className="gap-y-4xs flex flex-col">
                            <strong className="text-body-xs text-neutral-subtle">Last modified</strong>
                            {timeAgo(Date.now() - sessionData.metadata.lastModifiedMs)}
                        </div>
                        <div className="gap-y-4xs flex flex-col">
                            <strong className="text-body-xs text-neutral-subtle">Last persisted</strong>
                            {timeAgo(Date.now() - activeSession.getMetadata().lastModifiedMs)}
                        </div>
                    </div>
                </div>
            </div>
        </AlertDialog>
    );
}
