import React from "react";

import { BugReport, Check, Error as ErrorIcon, Refresh } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";

import { getAliveOptions } from "@api";
import { GuiEvent, useRegisterGuiEventSubscriber, type GuiEventPayloads } from "@framework/GuiMessageBroker";
import { SessionPersistenceAction } from "@framework/internal/WorkbenchSession/WorkbenchSessionManager";
import type { Workbench } from "@framework/Workbench";
import { CircularProgress } from "@lib/newComponents/CircularProgress";
import { Dialog } from "@lib/newComponents/Dialog";
import { Button } from "@lib/newComponents/Button";
import { useSymbolicateStackTrace } from "@lib/hooks/useSymbolicateStackTrace";

export type SessionErrorDialogProps = {
    workbench: Workbench;
};

function makeModalText(failingAction: SessionPersistenceAction | undefined): { title: string; body: string } {
    if (!failingAction) return { title: "", body: "" };

    switch (failingAction) {
        case SessionPersistenceAction.LOAD:
            return { title: "Unable to load session", body: "Could not load the session due to the following error:" };
        case SessionPersistenceAction.SAVE:
            return { title: "Unable to save session", body: "Could not save the session due to the following error:" };
        // ! Ended up this one being handled by the confirmation service dialog, so this shouldn't happen. Just keeping it here for brevity
        case SessionPersistenceAction.LOCAL_LOAD:
            return {
                title: "Unable to load session backup",
                body: "Could not load the local session backup due to the following error:",
            };

        case SessionPersistenceAction.OPEN_SNAPSHOT:
            return {
                title: "Unable to open snapshot",
                body: "Could not open the snapshot due to the following error:",
            };
        case SessionPersistenceAction.CREATE_SNAPSHOT:
            return {
                title: "Unable to create snapshot",
                body: "Could not create a snapshot from the session due to the following error:",
            };
        default:
            console.warn(`Unknown session persistence action: ${failingAction}`);
            return { title: "Something went wrong", body: "The session service failed due to the following error:" };
    }
}

export function SessionErrorDialog(props: SessionErrorDialogProps): React.ReactNode {
    const guiMessageBroker = props.workbench.getGuiMessageBroker();

    const [errorEventPayload, setErrorEventPayload] = React.useState<
        GuiEventPayloads[GuiEvent.SessionPersistenceError] | null
    >(null);

    const isOpen = errorEventPayload !== null;
    const { title, body } = makeModalText(errorEventPayload?.action);

    const handleSessionSaveError = React.useCallback(function sessionErrorCallback(
        payload: GuiEventPayloads[GuiEvent.SessionPersistenceError],
    ) {
        setErrorEventPayload(payload);
    }, []);

    const onCloseModal = React.useCallback(function onCloseModal() {
        setErrorEventPayload(null);
    }, []);

    function onTryAgain() {
        if (!errorEventPayload) return;

        onCloseModal();
        errorEventPayload.retry();
    }

    // Subscribe to the session error gui-event
    useRegisterGuiEventSubscriber(guiMessageBroker, GuiEvent.SessionPersistenceError, handleSessionSaveError);

    const { reportIssue, isSymbolicatingStack } = useSymbolicateStackTrace(errorEventPayload?.error);

    return (
        <Dialog.Popup open={isOpen} width={700} modal onOpenChange={onCloseModal}>
            <Dialog.Header closeIconVisible>
                <Dialog.Title>
                    <ErrorIcon className="text-danger-subtle inline-block" fontSize="inherit" /> {title}
                </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body layoutClassName="flex flex-col gap-y-2xs">
                <p>{body}</p>
                <p className="bg-canvas px-sm py-sm overflow-x-scroll rounded font-mono text-sm whitespace-nowrap">
                    <strong>{errorEventPayload?.error?.name}</strong>: {errorEventPayload?.error?.message}
                </p>
                <p>
                    Make sure that you have a stable internet connection and try again. If the problem persists, please
                    report the issue using the link below
                </p>

                {isOpen && (
                    <ul className="leading-body-lg">
                        <InternetConnectedChecker />
                        <BackendAliveChecker />
                    </ul>
                )}
            </Dialog.Body>
            <Dialog.Actions>
                <Button variant="ghost" onClick={reportIssue} disabled={isSymbolicatingStack} tone="neutral">
                    {isSymbolicatingStack ? (
                        <>
                            <CircularProgress size={16} /> Reporting...
                        </>
                    ) : (
                        <>
                            <BugReport style={{ fontSize: 16 }} /> Report Issue
                        </>
                    )}
                </Button>
                <Button onClick={onTryAgain}>
                    <Refresh style={{ fontSize: 16 }} /> Try again
                </Button>
            </Dialog.Actions>
        </Dialog.Popup>
    );
}

function InternetConnectedChecker(): React.ReactNode {
    const [isOnline, setIsOnline] = React.useState(window.navigator.onLine);

    React.useEffect(() => {
        const connectionStatusListener = () => setIsOnline(window.navigator.onLine);

        window.addEventListener("offline", connectionStatusListener);
        window.addEventListener("online", connectionStatusListener);

        return () => {
            window.removeEventListener("offline", connectionStatusListener);
            window.removeEventListener("online", connectionStatusListener);
        };
    });

    if (isOnline) {
        return (
            <li>
                <Check className="text-success-subtle inline-block" fontSize="inherit" /> You are connected to the
                internet
            </li>
        );
    } else {
        return (
            <li>
                <ErrorIcon className="text-danger-subtle inline-block" fontSize="inherit" /> You are not connected to
                the internet
            </li>
        );
    }
}

function BackendAliveChecker(): React.ReactNode {
    const aliveQuery = useQuery({ ...getAliveOptions(), gcTime: 0, staleTime: 0, refetchOnMount: true });

    const isAlive = !!aliveQuery.data;

    if (aliveQuery.isFetching) {
        return (
            <li>
                <CircularProgress layoutClassName="inline-block align-middle" size={16} /> Testing connection to backend
                service...
            </li>
        );
    } else if (aliveQuery.isError) {
        return (
            <li>
                <ErrorIcon className="text-danger-subtle inline-block" fontSize="inherit" /> Unable to connect to the
                Webviz backend
            </li>
        );
    } else if (isAlive) {
        return (
            <li>
                <Check className="text-success-subtle inline-block" fontSize="inherit" /> Backend is running
            </li>
        );
    }
}
