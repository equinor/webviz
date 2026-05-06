import React from "react";

import { Delete, OpenInBrowser, OpenInNew, Warning } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";

import { getSessionMetadataOptions } from "@api";
import { GuiState, useGuiState } from "@framework/GuiMessageBroker";
import { loadAllWorkbenchSessionsFromLocalStorage } from "@framework/internal/WorkbenchSession/utils/loaders";
import { buildSessionUrl } from "@framework/internal/WorkbenchSession/utils/url";
import {
    isPersisted,
    type WorkbenchSessionDataContainer,
} from "@framework/internal/WorkbenchSession/utils/WorkbenchSessionDataContainer";
import type { Workbench } from "@framework/Workbench";
import { Table } from "@lib/components/Table";
import type { TableColumns } from "@lib/components/Table/types";
import { Tooltip } from "@lib/components/Tooltip";
import { Button } from "@lib/newComponents/Button";
import { CircularProgress } from "@lib/newComponents/CircularProgress";
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

    function handleOpen(sessionId: string | undefined) {
        props.workbench.getSessionManager().openFromLocalStorage(sessionId ?? null);
    }

    function handleOpenInNewTab(sessionId: string) {
        const url = buildSessionUrl(sessionId);
        window.open(url, "_blank");
    }

    function makeTableColumns(): TableColumns<TableData> {
        return [
            {
                label: "Name",
                _type: "data",
                columnId: "name",
                sizeInPercent: 25,
                formatStyle: () => ({ fontWeight: "bold" }),
            },
            {
                label: "Created",
                _type: "data",
                columnId: "created",
                sizeInPercent: 20,
            },
            {
                label: "Last modified",
                _type: "data",
                columnId: "lastModified",
                sizeInPercent: 20,
            },
            {
                label: "Last saved",
                _type: "data",
                columnId: "lastSaved",
                sizeInPercent: 20,
                renderData: function SessionSaveState(_, context) {
                    const session = context.entry.session;
                    const backendSession = useQuery({
                        ...getSessionMetadataOptions({
                            path: { session_id: session.id ?? "" },
                        }),
                        enabled: Boolean(session.id) && isPersisted(session),
                        gcTime: 0,
                        staleTime: 0,
                    });

                    if (!session.id) {
                        return (
                            <Tooltip title="This session has never been saved.">
                                <span className="text-neutral-subtle italic">Never saved</span>
                            </Tooltip>
                        );
                    }

                    if (backendSession.isLoading) {
                        return (
                            <span className="text-neutral-subtle gap-horizontal-xs flex items-center italic">
                                <CircularProgress size={16} /> Checking...
                            </span>
                        );
                    }

                    if (backendSession.isError) {
                        return (
                            <Tooltip title="An error occurred while checking the session. No data could be loaded from the backend, but you can still open the session and recover unsaved work.">
                                <span className="text-warning-subtle gap-horizontal-xs flex items-center italic">
                                    <Warning fontSize="inherit" /> Error checking session
                                </span>
                            </Tooltip>
                        );
                    }

                    return (
                        <span className="gap-horizontal-xs flex items-center">
                            {backendSession.data
                                ? new Date(backendSession.data.updatedAt).toLocaleString()
                                : "Never saved"}
                        </span>
                    );
                },
            },
            {
                label: "Actions",
                _type: "data",
                columnId: "actions",
                sizeInPercent: 15,
                renderData: function Actions(_, context) {
                    const sessionId = context.entry.session.id;

                    return (
                        <div className="gap-horizontal-xs flex justify-end">
                            <Tooltip
                                title={
                                    sessionId
                                        ? "Open this session in a new tab."
                                        : "Opening unsaved sessions in a new tab is not supported yet."
                                }
                                placement="left"
                            >
                                <span>
                                    <Button
                                        onClick={() => handleOpenInNewTab(sessionId ?? "")}
                                        size="small"
                                        variant="text"
                                        iconOnly
                                        disabled={!sessionId}
                                    >
                                        <OpenInNew fontSize="inherit" />
                                    </Button>
                                </span>
                            </Tooltip>
                            <Tooltip title="Open this session in the current tab." placement="left">
                                <span>
                                    <Button onClick={() => handleOpen(sessionId)} size="small" variant="text" iconOnly>
                                        <OpenInBrowser fontSize="inherit" />
                                    </Button>
                                </span>
                            </Tooltip>
                            <Tooltip
                                title="Delete this session. This cannot be undone, but it will not affect any sessions saved in the backend."
                                placement="left"
                            >
                                <span>
                                    <Button
                                        onClick={() => handleDiscard(sessionId ?? null)}
                                        size="small"
                                        variant="text"
                                        tone="danger"
                                        iconOnly
                                    >
                                        <Delete fontSize="inherit" />
                                    </Button>
                                </span>
                            </Tooltip>
                        </div>
                    );
                },
            },
        ];
    }

    const rowData: TableData[] = sessions.map((session) => ({
        session,
        name: session.metadata.title,
        created: new Date(session.metadata.createdAt).toLocaleString(),
        lastModified: new Date(session.metadata.lastModifiedMs).toLocaleString(),
        lastSaved: "Never",
        actions: null, // Will be rendered in the column definition to have access to the session id
    }));

    return (
        <Dialog.Popup open={isOpen}>
            <Dialog.Header>
                <Dialog.Title>Multiple unsaved local sessions found</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
                <div className="gap-vertical-md flex flex-col">
                    <Dialog.Description>
                        We found one or more previous sessions with unsaved changes in your local browser. You can
                        either delete them or open one of the sessions below to recover your work.
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
                <Button onClick={handleDiscardAll} variant="text" tone="danger">
                    Delete all and close
                </Button>
                <Button onClick={handleCancel} variant="contained">
                    Not now
                </Button>
            </Dialog.Actions>
        </Dialog.Popup>
    );
}

type TableData = {
    session: WorkbenchSessionDataContainer;
    name: string;
    created: string;
    lastModified: string;
    lastSaved: string;
    actions: React.ReactNode;
};
