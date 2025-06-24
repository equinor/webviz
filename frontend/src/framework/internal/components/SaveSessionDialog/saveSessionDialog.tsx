import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dialog } from "@lib/components/Dialog";
import React from "react";
import { DashboardPreview } from "../DashboardPreview/dashboardPreview";
import { Label } from "@lib/components/Label";
import { Input } from "@lib/components/Input";
import { GuiState, useGuiState, useGuiValue } from "@framework/GuiMessageBroker";

export type SaveSessionDialogProps = {
    workbench: Workbench;
};

type SaveSessionDialogInputFeedback = {
    title?: string;
    description?: string;
};

export function SaveSessionDialog(props: SaveSessionDialogProps): React.ReactNode {
    const [saveSessionDialogOpen, setSaveSessionDialogOpen] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.SaveSessionDialogOpen,
    );
    const isSaving = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.IsSavingSession);
    const [title, setTitle] = React.useState<string>("");
    const [description, setDescription] = React.useState<string>("");
    const [inputFeedback, setInputFeedback] = React.useState<SaveSessionDialogInputFeedback>({});

    function handleSave() {
        if (title.trim() === "") {
            setInputFeedback((prev) => ({ ...prev, title: "Title is required." }));
            return;
        } else {
            setInputFeedback((prev) => ({ ...prev, title: undefined }));
        }

        if (description.trim() === "") {
            setInputFeedback((prev) => ({ ...prev, description: "Description is required." }));
            return;
        } else {
            setInputFeedback((prev) => ({ ...prev, description: undefined }));
        }
        const sessionData = { title, description };
        props.workbench.getWorkbenchSession().setMetadata(sessionData);
        props.workbench
            .saveCurrentSession(true)
            .then(() => {
                setTitle("");
                setDescription("");
                setInputFeedback({});
            })
            .catch((error) => {
                console.error("Failed to save session:", error);
            });
    }

    function handleCancel() {
        setSaveSessionDialogOpen(false);
        setTitle("");
        setDescription("");
        setInputFeedback({});
    }

    const layout = props.workbench.getWorkbenchSession().getActiveDashboard()?.getLayout() || [];

    return (
        <Dialog
            open={saveSessionDialogOpen}
            onClose={handleCancel}
            title="Save Session"
            modal
            showCloseCross
            actions={
                <>
                    <Button variant="text" disabled={isSaving} onClick={handleCancel}>
                        Cancel
                    </Button>
                    <Button variant="text" color="success" disabled={isSaving} onClick={handleSave}>
                        {isSaving && <CircularProgress size="small" />} Save
                    </Button>
                </>
            }
        >
            <div className="flex gap-4 items-center">
                <DashboardPreview height={100} width={100} layout={layout} />
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
