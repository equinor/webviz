import React from "react";

import { GuiState, useGuiState } from "@framework/GuiMessageBroker";
import { loadAllWorkbenchSessionsFromLocalStorage } from "@framework/internal/WorkbenchSession/utils/loaders";
import type { WorkbenchSessionDataContainer } from "@framework/internal/WorkbenchSession/utils/WorkbenchSessionDataContainer";
import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { Dialog } from "@lib/components/Dialog";

import { SessionRow } from "./private-components/sessionRow";

export type MultiSessionsRecoveryDialogProps = {
    workbench: Workbench;
};

export function MultiSessionsRecoveryDialog(props: MultiSessionsRecoveryDialogProps): React.ReactNode {
    const [isOpen, setIsOpen] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.MultiSessionsRecoveryDialogOpen,
    );
    const [sessions, setSessions] = React.useState<WorkbenchSessionDataContainer[]>([]);

    async function loadSessions() {
        const loadedSessions = await loadAllWorkbenchSessionsFromLocalStorage();

        setSessions(loadedSessions);
    }

    React.useEffect(
        function loadSessionOnOpen() {
            if (isOpen) {
                loadSessions();
            }
        },
        [isOpen],
    );

    if (!isOpen) {
        return null;
    }

    function handleCancel() {
        setIsOpen(false);
    }

    function handleDiscard(sessionId: string | null) {
        props.workbench.getSessionManager().discardLocalStorageSession(sessionId);
        loadSessions();
    }

    function handleDiscardAll() {
        props.workbench.getSessionManager().discardAllLocalStorageSessions();
        handleCancel();
    }

    function handleOpen(sessionId: string | null) {
        props.workbench.getSessionManager().openFromLocalStorage(sessionId);
    }

    return (
        <Dialog
            open={isOpen}
            modal
            showCloseCross={false}
            title="Do you want to recover your session?"
            actions={
                <>
                    <Button onClick={handleCancel} variant="text">
                        Cancel
                    </Button>
                    <Button onClick={handleDiscardAll} variant="text" color="danger">
                        Discard all and close
                    </Button>
                </>
            }
            width={800}
        >
            We found one or more previous sessions with unsaved changes. You can either discard them or open one of the
            sessions below to recover your work.
            <table className="table-auto w-full border-collapse mt-4 border-spacing-4 text-sm">
                <thead>
                    <tr>
                        <th className="p-2 border-b">Name</th>
                        <th className="p-2 border-b">Created At</th>
                        <th className="p-2 border-b">Updated at</th>
                        <th className="p-2 border-b">Last persisted</th>
                        <th className="p-2 border-b">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {sessions.map((session, i) => (
                        <SessionRow
                            key={session.id ?? `localStore::${i}`}
                            session={session}
                            onOpen={handleOpen}
                            onDiscard={handleDiscard}
                        />
                    ))}
                </tbody>
            </table>
        </Dialog>
    );
}
