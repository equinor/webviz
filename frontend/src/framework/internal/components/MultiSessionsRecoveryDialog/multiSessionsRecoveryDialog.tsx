import { GuiState, useGuiState } from "@framework/GuiMessageBroker";
import { PrivateWorkbenchSession } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import { loadAllWorkbenchSessionsFromLocalStorage } from "@framework/internal/WorkbenchSession/WorkbenchSessionLoader";
import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { Dialog } from "@lib/components/Dialog";
import React from "react";
import { SessionRow } from "./private-components/sessionRow";

export type MultiSessionsRecoveryDialogProps = {
    workbench: Workbench;
};

export function MultiSessionsRecoveryDialog(props: MultiSessionsRecoveryDialogProps): React.ReactNode {
    const [isOpen, setIsOpen] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.MultiSessionsRecoveryDialogOpen,
    );
    const [sessions, setSessions] = React.useState<PrivateWorkbenchSession[]>([]);

    async function loadSessions() {
        const loadedSessions = await loadAllWorkbenchSessionsFromLocalStorage(
            props.workbench.getAtomStoreMaster(),
            props.workbench.getQueryClient(),
        );

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
        props.workbench.discardLocalStorageSession(sessionId);
        loadSessions();
    }

    function handleOpen(sessionId: string | null) {
        props.workbench.openSessionFromLocalStorage(sessionId);
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
                </>
            }
            width={800}
        >
            We found one or more previous sessions with unsaved changes. You can either discard them or open one of the
            sessions below to recover your work.
            <table className="table-auto  border-collapse mt-4 border-spacing-4 text-sm">
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
                    {sessions.map((session) => (
                        <SessionRow
                            session={session}
                            key={session.getId()}
                            onOpen={handleOpen}
                            onDiscard={handleDiscard}
                        />
                    ))}
                </tbody>
            </table>
        </Dialog>
    );
}
