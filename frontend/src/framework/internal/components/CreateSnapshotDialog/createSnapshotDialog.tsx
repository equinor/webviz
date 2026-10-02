import React from "react";

import { AddLink } from "@mui/icons-material";

import { GuiState, useGuiState, useGuiValue } from "@framework/GuiMessageBroker";
import { MAX_TITLE_LENGTH } from "@framework/internal/persistence/constants";
import { buildWorkbenchUrl } from "@framework/internal/WorkbenchSession/utils/url";
import type { Workbench } from "@framework/Workbench";
import { AlertDialog } from "@lib/components/AlertDialog";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dialog } from "@lib/components/Dialog";
import { truncateString } from "@lib/utils/strings";

import { useActiveSession } from "../ActiveSessionBoundary";

import { Confirmation } from "./_private-components/confirmation";
import { Form } from "./_private-components/form";

export type MakeSnapshotDialogProps = {
    workbench: Workbench;
};

export function CreateSnapshotDialog(props: MakeSnapshotDialogProps): React.ReactNode {
    const activeSession = useActiveSession();

    const sessionTitle = activeSession.getMetadata().title;
    const sessionDescription = activeSession.getMetadata().description ?? "";
    const initialTitle = `Snapshot: ${truncateString(sessionTitle, MAX_TITLE_LENGTH)}`;
    const initialDescription = sessionDescription;
    const initialActiveDashboardId = activeSession.getActiveDashboard()?.getId();

    const [workingTitle, setWorkingTitle] = React.useState<string | null>(null);
    const [workingDescription, setWorkingDescription] = React.useState<string | null>(null);
    const [workingActiveDashboardId, setWorkingActiveDashboardId] = React.useState<string | null>(null);
    const [showConfirmationDialog, setShowConfirmationDialog] = React.useState<boolean>(false);
    const [snapshotUrl, setSnapshotUrl] = React.useState<string | null>(null);

    const [isOpen, setIsOpen] = useGuiState(props.workbench.getGuiMessageBroker(), GuiState.MakeSnapshotDialogOpen);
    const isSaving = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.IsMakingSnapshot);

    const inputRef = React.useRef<HTMLInputElement>(null);
    const formId = React.useId();

    const activeTitle = workingTitle ?? initialTitle;
    const activeDescription = workingDescription ?? initialDescription;
    const activeDashboardId = workingActiveDashboardId ?? initialActiveDashboardId;

    function handleCreateSnapshot(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (activeTitle.trim() === "") {
            inputRef.current?.focus();
            return;
        }

        props.workbench
            .getSessionManager()
            .createSnapshot(activeTitle, activeDescription, activeDashboardId)
            .then((snapshotId) => {
                if (!snapshotId) {
                    return;
                }
                setSnapshotUrl(buildWorkbenchUrl({ kind: "snapshot", snapshotId, dashboardId: activeDashboardId ?? null }));
            })
            .catch((error) => {
                console.error("Failed to save session:", error);
            });
    }

    function handleCancel() {
        if (
            !snapshotUrl &&
            (activeTitle !== initialTitle ||
                activeDescription !== initialDescription ||
                activeDashboardId !== initialActiveDashboardId)
        ) {
            setShowConfirmationDialog(true);
            return;
        }
        handleDiscardChanges();
    }

    function handleDiscardChanges() {
        setIsOpen(false);
        setSnapshotUrl(null);
        setWorkingTitle(null);
        setWorkingDescription(null);
        setWorkingActiveDashboardId(null);
    }

    if (activeSession.isSnapshot()) {
        return null;
    }

    let content: React.ReactNode;
    let actions: React.ReactNode;

    if (!snapshotUrl) {
        content = (
            <Form
                id={formId}
                titleInputRef={inputRef}
                workbench={props.workbench}
                title={activeTitle}
                description={activeDescription}
                activeDashboardId={activeDashboardId}
                setTitle={setWorkingTitle}
                setDescription={setWorkingDescription}
                setActiveDashboardId={setWorkingActiveDashboardId}
                onSubmit={handleCreateSnapshot}
            />
        );

        actions = (
            <>
                <Button variant="ghost" tone="neutral" disabled={isSaving} onClick={handleCancel}>
                    Cancel
                </Button>
                <Button tone="accent" disabled={isSaving} type="submit" form={formId}>
                    {isSaving && <CircularProgress size={16} />}
                    <AddLink style={{ fontSize: 16 }} /> Create snapshot
                </Button>
            </>
        );
    } else {
        content = <Confirmation snapshotUrl={snapshotUrl} />;

        actions = (
            <>
                <Button disabled={isSaving} onClick={handleCancel}>
                    Done
                </Button>
            </>
        );
    }

    return (
        <>
            <Dialog.Popup open={isOpen} onOpenChange={handleCancel} modal width={600}>
                <Dialog.Header closeIconVisible>
                    <Dialog.Title>Create Snapshot</Dialog.Title>
                </Dialog.Header>
                <Dialog.Body>{content}</Dialog.Body>
                <Dialog.Actions>{actions}</Dialog.Actions>
            </Dialog.Popup>
            <AlertDialog
                open={showConfirmationDialog}
                onOpenChange={setShowConfirmationDialog}
                title="Discard changes?"
                primaryAction={{
                    label: "Discard",
                    onClick: handleDiscardChanges,
                    tone: "danger",
                    closesDialog: true,
                }}
                secondaryActions={[
                    {
                        label: "Keep editing",
                        onClick: () => setShowConfirmationDialog(false),
                        tone: "neutral",
                        closesDialog: true,
                    },
                ]}
            >
                You have unsaved changes. Are you sure you want to discard them and close the dialog?
            </AlertDialog>
        </>
    );
}
