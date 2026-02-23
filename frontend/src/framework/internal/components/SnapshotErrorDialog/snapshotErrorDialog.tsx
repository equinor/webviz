import React from "react";

import { Check, Close, Error, Refresh } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";

import { getAliveOptions } from "@api";
import { GuiEvent, useGuiEventListener, type GuiEventPayloads } from "@framework/GuiMessageBroker";
import { SnapshotPersistenceAction } from "@framework/internal/WorkbenchSession/WorkbenchSessionManager";
import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { ErrorDialog } from "@lib/components/Dialog";

export type SnapshotErrorDialogProps = {
    workbench: Workbench;
};

function makeModalText(failingAction: SnapshotPersistenceAction | undefined): { title: string; body: string } {
    if (!failingAction) return { title: "", body: "" };

    switch (failingAction) {
        case SnapshotPersistenceAction.OPEN:
            return {
                title: "Unable to open snapshot",
                body: "Could not open the snapshot due to the following error:",
            };
        case SnapshotPersistenceAction.CREATE:
            return {
                title: "Unable to create snapshot",
                body: "Could not create a snapshot from the session due to the following error:",
            };
        default:
            console.warn(`Unknown snapshot persistence action: ${failingAction}`);
            return { title: "Something went wrong", body: "The session service failed due to the following error:" };
    }
}

export function SnapshotErrorDialog(props: SnapshotErrorDialogProps): React.ReactNode {
    const guiMessageBroker = props.workbench.getGuiMessageBroker();

    const [isOpen, setIsOpen] = React.useState(false);
    const [errorEventPayload, setErrorEventPayload] = React.useState<
        GuiEventPayloads[GuiEvent.SnapshotPersistenceError] | null
    >(null);

    const { title, body } = makeModalText(errorEventPayload?.action);

    const handleErrorCallback = React.useCallback(function handleErrorCallback(
        payload: GuiEventPayloads[GuiEvent.SnapshotPersistenceError],
    ) {
        setErrorEventPayload(payload);
        setIsOpen(true);
    }, []);

    const onCloseModal = React.useCallback(function onCloseModal() {
        setErrorEventPayload(null);
        setIsOpen(false);
    }, []);

    function onTryAgain() {
        if (!errorEventPayload) return;

        onCloseModal();
        errorEventPayload.retry();
    }

    // Subscribe to the snapshot error gui-event
    useGuiEventListener(guiMessageBroker, GuiEvent.SnapshotPersistenceError, handleErrorCallback);

    return (
        <ErrorDialog
            error={errorEventPayload?.error ?? null}
            open={isOpen}
            title={title}
            width={700}
            zIndex={100}
            modal
            showCloseCross
            onClose={onCloseModal}
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
