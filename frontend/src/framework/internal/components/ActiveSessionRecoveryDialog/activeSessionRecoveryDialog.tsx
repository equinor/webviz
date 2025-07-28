import { GuiState, useGuiState } from "@framework/GuiMessageBroker";
import type { PrivateWorkbenchSession } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import { loadAllWorkbenchSessionsFromLocalStorage } from "@framework/internal/WorkbenchSession/WorkbenchSessionLoader";
import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { Dialog } from "@lib/components/Dialog";
import React from "react";
import { DashboardPreview } from "../DashboardPreview/dashboardPreview";
import { timeAgo } from "@lib/utils/dates";

export type ActiveSessionRecoveryDialogProps = {
    workbench: Workbench;
};

export function ActiveSessionRecoveryDialog(props: ActiveSessionRecoveryDialogProps): React.ReactNode {
    const [isOpen] = useGuiState(props.workbench.getGuiMessageBroker(), GuiState.ActiveSessionRecoveryDialogOpen);

    const activeSession = props.workbench.getWorkbenchSession();

    const [session, setSession] = React.useState<PrivateWorkbenchSession | null>(null);

    async function loadSession() {
        const loadedSessions = await loadAllWorkbenchSessionsFromLocalStorage(
            props.workbench.getAtomStoreMaster(),
            props.workbench.getQueryClient(),
        );

        const storedSession = loadedSessions.find((s) => s.getId() === activeSession.getId());
        setSession(storedSession || null);
    }

    React.useEffect(
        function loadSessionOnOpen() {
            if (isOpen) {
                loadSession();
            }
        },
        [isOpen],
    );

    if (!isOpen || !session) {
        return null;
    }

    function handleDiscard() {
        props.workbench.discardLocalStorageSession(activeSession.getId(), false);
    }

    function handleOpen() {
        props.workbench.openSessionFromLocalStorage(activeSession.getId());
    }

    return (
        <Dialog
            open={isOpen}
            modal
            showCloseCross={false}
            title="Do you want to recover your session?"
            actions={
                <>
                    <Button onClick={handleOpen} variant="text">
                        Open
                    </Button>
                    <Button onClick={handleDiscard} variant="text" color="danger">
                        Discard
                    </Button>
                </>
            }
            width={800}
        >
            We found an unsaved version of your current session in your local storage. You can either discard it or open
            it to recover your work.
            <div className="flex gap-4 mt-4">
                <DashboardPreview height={150} width={150} layout={session?.getActiveDashboard()?.getLayout() ?? []} />
                <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-1">
                        <strong className="text-xs text-gray-500">Title</strong>
                        {session?.getMetadata().title}
                    </div>
                    <div className="flex flex-col gap-1">
                        <strong className="text-xs text-gray-500">Last modified</strong>
                        {timeAgo(Date.now() - session.getMetadata().lastModifiedMs)}
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
