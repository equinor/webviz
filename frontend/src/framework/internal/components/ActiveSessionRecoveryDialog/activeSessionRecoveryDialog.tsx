import React from "react";

import { GuiState, useGuiState, useGuiValue } from "@framework/GuiMessageBroker";
import {
    extractLayout,
    type WorkbenchSessionDataContainer,
} from "@framework/internal/WorkbenchSession/WorkbenchSessionDataContainer";
import { loadAllWorkbenchSessionsFromLocalStorage } from "@framework/internal/WorkbenchSession/WorkbenchSessionLoader";
import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dialog } from "@lib/components/Dialog";
import { timeAgo } from "@lib/utils/dates";

import { DashboardPreview } from "../DashboardPreview/dashboardPreview";

export type ActiveSessionRecoveryDialogProps = {
    workbench: Workbench;
};

export function ActiveSessionRecoveryDialog(props: ActiveSessionRecoveryDialogProps): React.ReactNode {
    const [isOpen, setIsOpen] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.ActiveSessionRecoveryDialogOpen,
    );

    const activeSession = props.workbench.getWorkbenchSession();
    const isLoading = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.IsLoadingSession);

    const [session, setSession] = React.useState<WorkbenchSessionDataContainer | null>(null);

    const loadSession = React.useCallback(
        async function loadSession() {
            const loadedSessions = await loadAllWorkbenchSessionsFromLocalStorage();

            const storedSession = loadedSessions.find((s) => s.id === activeSession.getId());
            setSession(storedSession || null);
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

    if (!isOpen || !session) {
        return null;
    }

    function handleDiscard() {
        props.workbench.discardLocalStorageSession(activeSession.getId(), false);
        setIsOpen(false);
    }

    function handleOpen() {
        props.workbench.openSessionFromLocalStorage(activeSession.getId(), true);
    }

    return (
        <Dialog
            open={isOpen}
            modal
            showCloseCross={false}
            title="Do you want to recover your session?"
            actions={
                <>
                    <Button onClick={handleOpen} variant="text" disabled={isLoading}>
                        {isLoading && <CircularProgress size="small" />}
                        Open
                    </Button>
                    <Button onClick={handleDiscard} variant="text" color="danger" disabled={isLoading}>
                        Discard
                    </Button>
                </>
            }
            width={800}
        >
            We found an unsaved version of your current session in your local storage. You can either discard it or open
            it to recover your work.
            <div className="flex gap-4 mt-4">
                <DashboardPreview height={150} width={150} layout={session ? extractLayout(session) : []} />
                <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-1">
                        <strong className="text-xs text-gray-500">Title</strong>
                        {session.metadata.title}
                    </div>
                    <div className="flex flex-col gap-1">
                        <strong className="text-xs text-gray-500">Last modified</strong>
                        {timeAgo(Date.now() - session.metadata.lastModifiedMs)}
                    </div>
                    <div className="flex flex-col gap-1">
                        <strong className="text-xs text-gray-500">Last persisted</strong>
                        {timeAgo(Date.now() - activeSession.getMetadata().lastModifiedMs)}
                    </div>
                </div>
            </div>
        </Dialog>
    );
}
