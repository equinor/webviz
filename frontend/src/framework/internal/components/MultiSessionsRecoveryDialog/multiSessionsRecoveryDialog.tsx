import React from "react";

import { GuiState, useGuiState } from "@framework/GuiMessageBroker";
import { loadAllWorkbenchSessionsFromLocalStorage } from "@framework/internal/WorkbenchSession/utils/loaders";
import type { WorkbenchSessionDataContainer } from "@framework/internal/WorkbenchSession/utils/WorkbenchSessionDataContainer";
import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { Table } from "@lib/components/Table";
import { TableColumns } from "@lib/components/Table/types";
import { Dialog } from "@lib/newComponents/Dialog";

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

    const rowData: TableData[] = sessions.map((session) => ({
        name: session.metadata.title,
        createdAt: new Date(session.metadata.createdAt).toLocaleString(),
        updatedAt: new Date(session.metadata.lastModifiedMs).toLocaleString(),
        lastPersisted: "Never",
        actions: (
            <>
                <Button onClick={() => handleOpen(session.id!)} variant="text" size="small">
                    Open
                </Button>
                <Button onClick={() => handleDiscard(session.id!)} variant="text" tone="danger" size="small">
                    Discard
                </Button>
            </>
        ),
    }));

    return (
        <Dialog.Popup open={isOpen}>
            <Dialog.Header>
                <Dialog.Title>Do you want to recover your session?</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
                <div className="gap-space-sm flex flex-col">
                    <Dialog.Description>
                        We found one or more previous sessions with unsaved changes. You can either discard them or open
                        one of the sessions below to recover your work.
                    </Dialog.Description>
                    <Table
                        rowIdentifier="name"
                        rowHeight={38}
                        height="100%"
                        columns={makeTableColumns()}
                        rows={rowData}
                    />
                </div>
            </Dialog.Body>
            <Dialog.Actions>
                <Button onClick={handleCancel} variant="text">
                    Cancel
                </Button>
                <Button onClick={handleDiscardAll} variant="text" tone="danger">
                    Discard all and close
                </Button>
            </Dialog.Actions>
        </Dialog.Popup>
    );
}

type TableData = {
    name: string;
    createdAt: string;
    updatedAt: string;
    lastPersisted: string;
    actions: React.ReactNode;
};

function makeTableColumns(): TableColumns<TableData> {
    return [
        {
            label: "Name",
            _type: "data",
            columnId: "name",
            sizeInPercent: 25,
        },
        {
            label: "Created At",
            _type: "data",
            columnId: "createdAt",
            sizeInPercent: 20,
        },
        {
            label: "Updated at",
            _type: "data",
            columnId: "updatedAt",
            sizeInPercent: 20,
        },
        {
            label: "Last persisted",
            _type: "data",
            columnId: "lastPersisted",
            sizeInPercent: 20,
        },
        {
            label: "Actions",
            _type: "data",
            columnId: "actions",
            sizeInPercent: 15,
        },
    ];
}
