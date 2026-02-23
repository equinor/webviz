import React from "react";

import { Check, Close, Error, Refresh } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";

import { getAliveOptions } from "@api";
import { GuiEvent, useGuiEventListener, type GuiEventPayloads } from "@framework/GuiMessageBroker";
import type { SessionPersistenceAction } from "@framework/internal/WorkbenchSession/WorkbenchSessionManager";
import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { ErrorDialog } from "@lib/components/Dialog";

export type SessionErrorDialogProps = {
    workbench: Workbench;
};

function makeModalText(failingAction: SessionPersistenceAction | undefined): { title: string; body: string } {
    if (!failingAction) return { title: "", body: "" };

    switch (failingAction) {
        case "load":
            return { title: "Unable to load session", body: "Could not load the session due the following error:" };
        case "save":
            return { title: "Unable to save session", body: "Could not save the session due the following error:" };
        default:
            console.warn(`Unknown session persistence action: ${failingAction}`);
            return { title: "Something went wrong", body: "The session service failed due to the following error:" };
    }
}

export function SessionErrorDialog(props: SessionErrorDialogProps): React.ReactNode {
    const guiMessageBroker = props.workbench.getGuiMessageBroker();

    const [isOpen, setIsOpen] = React.useState(false);
    const [errorEventPayload, setErrorEventPayload] = React.useState<
        GuiEventPayloads[GuiEvent.SessionPersistenceError] | null
    >(null);

    const { title, body } = makeModalText(errorEventPayload?.action);

    const handleSessionSaveError = React.useCallback(function sessionErrorCallback(
        payload: GuiEventPayloads[GuiEvent.SessionPersistenceError],
    ) {
        setErrorEventPayload(payload);
        setIsOpen(true);
    }, []);

    const onCloseModal = React.useCallback(function onCloseModal() {
        setErrorEventPayload(null);
        setIsOpen(false);
    }, []);

    function onTryAgain() {
        if (!errorEventPayload?.action) return;

        switch (errorEventPayload?.action) {
            case "load":
                onCloseModal();
                return props.workbench.getSessionManager().openSession(errorEventPayload.actionOpts);
            case "save":
                onCloseModal();
                return props.workbench.getSessionManager().saveSession(errorEventPayload.actionOpts);
            default:
                console.warn(`Unknown session persistence action: ${errorEventPayload?.action}`);
        }
    }

    // Subscribe to the session error gui-event
    useGuiEventListener(guiMessageBroker, GuiEvent.SessionPersistenceError, handleSessionSaveError);

    return (
        <ErrorDialog
            error={errorEventPayload?.error ?? null}
            open={isOpen}
            title={title}
            modal
            showCloseCross
            onClose={onCloseModal}
            width={700}
            actions={
                <Button onClick={onTryAgain} startIcon={<Refresh fontSize="small" />}>
                    Try again
                </Button>
            }
        >
            <p>{body}</p>
            <p className="bg-slate-200 p-4 my-2 whitespace-nowrap font-mono text-sm overflow-x-scroll rounded">
                <strong>{errorEventPayload?.error?.name}</strong>: {errorEventPayload?.error?.message}
            </p>
            <p>
                Make sure that you have a stable internet connection and try again. If the problem persists, please
                report the issue using the link below
            </p>

            {isOpen && (
                <ul className="mt-4">
                    <InternetConnectedChecker />
                    <BackendAliveChecker />
                </ul>
            )}
        </ErrorDialog>
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
                <Check className="inline-block sizeClass text-green-700" fontSize="inherit" /> You are connected to the
                internet
            </li>
        );
    } else {
        return (
            <li>
                <Error className="inline-block sizeClass text-red-700" fontSize="inherit" /> You are not connected to
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
                <CircularProgress className="inline-block align-middle" size="small" /> Testing connection to backend
                service...
            </li>
        );
    } else if (aliveQuery.isError) {
        return (
            <li>
                <Close className="inline-block sizeClass text-red-700" fontSize="inherit" /> Unable to the Webviz
                backend
            </li>
        );
    } else if (isAlive) {
        return (
            <li>
                <Check className="inline-block sizeClass text-green-700" fontSize="inherit" /> Backend is running
            </li>
        );
    }
}
