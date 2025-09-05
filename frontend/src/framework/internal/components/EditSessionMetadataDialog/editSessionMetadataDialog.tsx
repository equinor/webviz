import React from "react";

import type { SessionMetadata_api } from "@api";
import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dialog } from "@lib/components/Dialog";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";

// import { DashboardPreview } from "../DashboardPreview/dashboardPreview";

export type EditSessionMetadataDialogProps = {
    open: boolean;
    sessionId: string;
    sessionMetadata: SessionMetadata_api;
    workbench: Workbench;
    onSaved?: () => void;
    onClose?: () => void;
};

type EditingInputFeedback = {
    title?: string;
    description?: string;
};

export function EditSessionMetadataDialog(props: EditSessionMetadataDialogProps): React.ReactNode {
    const [prevOpen, setPrevOpen] = React.useState(props.open);
    const [title, setTitle] = React.useState<string>("");
    const [description, setDescription] = React.useState<string>("");

    const [inputFeedback, setInputFeedback] = React.useState<EditingInputFeedback>({});
    const [isSaving, setIsSaving] = React.useState(false);

    if (prevOpen !== props.open) {
        setPrevOpen(props.open);
        if (props.open) {
            setTitle(props.sessionMetadata.title);
            setDescription(props.sessionMetadata.description ?? "");
        }
    }

    // const [savePending, setSavePending] = React.useState(false);

    // const isSaving = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.IsSavingSession);

    async function handleSave() {
        if (title.trim() === "") {
            setInputFeedback((prev) => ({ ...prev, title: "Title is required." }));
            return;
        } else {
            setInputFeedback((prev) => ({ ...prev, title: undefined }));
        }

        setIsSaving(true);

        await props.workbench.updateSession({
            id: props.sessionId,
            metadata: {
                title: title,
                description: description === "" ? null : description,
            },
        });

        setIsSaving(false);

        props.onSaved?.();
        handleClose();
    }

    function handleClose() {
        setTitle("");
        setDescription("");
        setInputFeedback({});
        props.onClose?.();
    }

    return (
        <Dialog
            open={props.open}
            onClose={handleClose}
            title="Save Session"
            modal
            showCloseCross
            actions={
                <>
                    <Button variant="text" disabled={isSaving} onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button variant="text" color="success" disabled={isSaving} onClick={handleSave}>
                        {isSaving && <CircularProgress size="small" />} Save
                    </Button>
                </>
            }
        >
            <div className="flex gap-4 items-center">
                {/* <DashboardPreview height={100} width={100} layout={layout} /> */}
                <div className="flex flex-col gap-2 grow min-w-0">
                    <Label text="Title">
                        <>
                            <Input
                                placeholder="Enter session title"
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                error={!!inputFeedback.title}
                                autoFocus
                            />
                            {inputFeedback.title && (
                                <div className="text-red-600 text-sm mt-1">{inputFeedback.title}</div>
                            )}
                        </>
                    </Label>
                    <Label text="Description">
                        <>
                            <Input
                                placeholder="Enter session description"
                                value={description}
                                multiline
                                onChange={(e) => setDescription(e.target.value)}
                                error={!!inputFeedback.description}
                            />
                            {inputFeedback.description && (
                                <div className="text-red-600 text-sm mt-1">{inputFeedback.description}</div>
                            )}
                        </>
                    </Label>
                </div>
            </div>
        </Dialog>
    );
}
