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
import { AlertDialog } from "@lib/components/AlertDialog";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dialog } from "@lib/components/Dialog";
import { Table } from "@lib/components/Table";
import { Tooltip } from "@lib/components/Tooltip";
import { formatDate } from "@lib/utils/dates";

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

    function handleDiscard(sessionId: string | undefined) {
        props.workbench.getSessionManager().discardLocalStorageSession(sessionId ?? null);
        loadSessions();
    }

    function handleDiscardAll() {
        props.workbench.getSessionManager().discardAllLocalStorageSessions();
        handleCancel();
    }

    function handleOpen(sessionId: string | undefined) {
        props.workbench.getSessionManager().openFromLocalStorage(sessionId ?? null);
    }

    function handleOpenInNewTab(sessionId: string | undefined) {
        const url = buildSessionUrl(sessionId ?? "");
        window.open(url, "_blank");
    }

    return (
        <AlertDialog
            title="Multiple unsaved local sessions found"
            open={isOpen}
            onOpenChange={setIsOpen}
            primaryAction={{ label: "Not now", onClick: handleCancel }}
            secondaryActions={[
                {
                    label: "Delete all and close",
                    onClick: handleDiscardAll,
                    tone: "danger",
                },
            ]}
        >
            <div className="gap-y-md flex w-full flex-col">
                <Dialog.Description>
                    We found one or more previous sessions with unsaved changes in your local browser. You can either
                    delete them or open one of the sessions below to recover your work.
                </Dialog.Description>

                <Table.Root size="small" compact layoutClassName="min-w-3xl w-full">
                    <Table.Head>
                        <Table.Column widthInPercent={25}>Name</Table.Column>
                        <Table.Column widthInPercent={20}>Created</Table.Column>
                        <Table.Column widthInPercent={20}>Last modified</Table.Column>
                        <Table.Column widthInPercent={20}>Last saved</Table.Column>
                        <Table.Column widthInPercent={15} layoutClassName="text-right">
                            Actions
                        </Table.Column>
                    </Table.Head>

                    <Table.Body>
                        {sessions.map((session, i) => (
                            <SessionRecoveryRow
                                key={session.id ?? i}
                                session={session}
                                onOpenInNewTab={handleOpenInNewTab}
                                onOpen={handleOpen}
                                onDiscard={handleDiscard}
                            />
                        ))}
                    </Table.Body>
                </Table.Root>
            </div>
        </AlertDialog>
    );
}

type SessionRecoveryRowProps = {
    session: WorkbenchSessionDataContainer;
    onOpenInNewTab: (id: string | undefined) => void;
    onOpen: (id: string | undefined) => void;
    onDiscard: (id: string | undefined) => void;
};

function SessionRecoveryRow(props: SessionRecoveryRowProps) {
    const { session, onOpenInNewTab, onOpen, onDiscard } = props;
    const sessionId = session.id;

    const backendSession = useQuery({
        ...getSessionMetadataOptions({
            path: { session_id: session.id ?? "" },
        }),
        enabled: Boolean(session.id) && isPersisted(session),
        gcTime: 0,
        staleTime: 0,
    });

    function makeSessionSaveStateMessage() {
        if (!session.id) {
            return (
                <Tooltip content="This session has never been saved.">
                    <span className="text-neutral-subtle italic">Never saved</span>
                </Tooltip>
            );
        }

        if (backendSession.isLoading) {
            return (
                <span className="text-neutral-subtle gap-x-xs flex items-center italic">
                    <CircularProgress size={16} /> Checking...
                </span>
            );
        }

        if (backendSession.isError) {
            return (
                <Tooltip content="An error occurred while checking the session. No data could be loaded from the backend, but you can still open the session and recover unsaved work.">
                    <span className="text-warning-subtle gap-x-xs flex items-center italic">
                        <Warning fontSize="inherit" /> Error checking session
                    </span>
                </Tooltip>
            );
        }

        return (
            <span className="gap-x-xs flex items-center">
                {backendSession.data ? formatDate(new Date(backendSession.data.updatedAt)) : "Never saved"}
            </span>
        );
    }

    return (
        <Table.Row>
            <Table.Cell>
                <span className="font-extrabold">{session.metadata.title}</span>
            </Table.Cell>
            <Table.Cell>{formatDate(session.metadata.createdAt)}</Table.Cell>
            <Table.Cell>{formatDate(session.metadata.lastModifiedMs)}</Table.Cell>
            <Table.Cell>{makeSessionSaveStateMessage()}</Table.Cell>
            <Table.Cell noPadding>
                <div className="px-xs gap-x-xs flex justify-end">
                    <Tooltip
                        content={
                            sessionId
                                ? "Open this session in a new tab."
                                : "Opening unsaved sessions in a new tab is not supported yet."
                        }
                        side="left"
                    >
                        <span>
                            <Button
                                variant="ghost"
                                iconOnly
                                disabled={!sessionId}
                                onClick={() => onOpenInNewTab(sessionId)}
                            >
                                <OpenInNew fontSize="inherit" />
                            </Button>
                        </span>
                    </Tooltip>
                    <Tooltip content="Open this session in the current tab." side="left">
                        <span>
                            <Button variant="ghost" iconOnly onClick={() => onOpen(sessionId)}>
                                <OpenInBrowser fontSize="inherit" />
                            </Button>
                        </span>
                    </Tooltip>
                    <Tooltip
                        content="Delete this session. This cannot be undone, but it will not affect any sessions saved in the backend."
                        side="left"
                    >
                        <span>
                            <Button variant="ghost" tone="danger" iconOnly onClick={() => onDiscard(sessionId)}>
                                <Delete fontSize="inherit" />
                            </Button>
                        </span>
                    </Tooltip>
                </div>
            </Table.Cell>
        </Table.Row>
    );
}
