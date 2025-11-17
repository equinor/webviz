import React from "react";

import { AddLink } from "@mui/icons-material";

import { GuiState, useGuiState, useGuiValue } from "@framework/GuiMessageBroker";
import { buildSnapshotUrl } from "@framework/internal/WorkbenchSession/utils/url";
import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dialog } from "@lib/components/Dialog";

import { Form } from "./_private-components/form";
import { Confirmation } from "./_private-components/confirmation";

export type MakeSnapshotDialogProps = {
    workbench: Workbench;
};

export function CreateSnapshotDialog(props: MakeSnapshotDialogProps): React.ReactNode {
    const [title, setTitle] = React.useState<string>("");
    const [description, setDescription] = React.useState<string>("");

    const [isOpen, setIsOpen] = useGuiState(props.workbench.getGuiMessageBroker(), GuiState.MakeSnapshotDialogOpen);

    const isSaving = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.IsMakingSnapshot);

    const [snapshotUrl, setSnapshotUrl] = React.useState<string | null>(null);

    const inputRef = React.useRef<HTMLInputElement>(null);

    function handleCreateSnapshot() {
        if (title.trim() === "") {
            inputRef.current?.focus();
            return;
        }

        props.workbench
            .getSessionManager()
            .createSnapshot(title, description)
            .then((snapshotId) => {
                if (!snapshotId) {
                    return;
                }
                setSnapshotUrl(buildSnapshotUrl(snapshotId));
            })
            .catch((error) => {
                console.error("Failed to save session:", error);
            });
    }

    function handleCancel() {
        setIsOpen(false);
        setSnapshotUrl(null);
    }

    let content: React.ReactNode = null;
    let actions: React.ReactNode = null;

    if (!snapshotUrl) {
        content = (
            <Form
                titleInputRef={inputRef}
                workbench={props.workbench}
                title={title}
                description={description}
                setTitle={setTitle}
                setDescription={setDescription}
            />
        );

        actions = (
            <>
                <Button variant="text" disabled={isSaving} onClick={handleCancel}>
                    Cancel
                </Button>
                <Button variant="text" color="success" disabled={isSaving} onClick={handleCreateSnapshot}>
                    {isSaving && <CircularProgress size="small" />}
                    <AddLink fontSize="inherit" /> Create snapshot
                </Button>
            </>
        );
    } else {
        content = <Confirmation snapshotUrl={snapshotUrl} />;

        actions = (
            <>
                <Button variant="text" disabled={isSaving} onClick={handleCancel}>
                    Close
                </Button>
            </>
        );
    }

    return (
        <Dialog open={isOpen} onClose={handleCancel} title="Create Snapshot" modal showCloseCross actions={actions}>
            {content}
        </Dialog>
    );
}
