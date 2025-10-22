import React from "react";

import { isEqual } from "lodash";

import { GuiState, useGuiState, useGuiValue } from "@framework/GuiMessageBroker";
import type { WorkbenchSessionMetadata } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import { WorkbenchTopic, type Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dialog } from "@lib/components/Dialog";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import { DashboardPreview } from "../DashboardPreview/dashboardPreview";

export type EditSessionDialogProps = {
    workbench: Workbench;
};

type EditSessionDialogInputFeedback = {
    title?: string;
    description?: string;
};

export function EditSessionDialog(props: EditSessionDialogProps): React.ReactNode {
    const [editSessionDialogOpen, setEditSessionDialogOpen] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.EditSessionDialogOpen,
    );

    const activeSession = usePublishSubscribeTopicValue(props.workbench, WorkbenchTopic.ACTIVE_SESSION);
    const metadata = usePublishSubscribeTopicValue(activeSession!, PrivateWorkbenchSessionTopic.METADATA);
    const isSaving = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.IsSavingSession);

    const [prevMetadata, setPrevMetadata] = React.useState<WorkbenchSessionMetadata>(metadata);
    const [title, setTitle] = React.useState<string>(metadata.title);
    const [description, setDescription] = React.useState<string>(metadata.description ?? "");
    const [inputFeedback, setInputFeedback] = React.useState<EditSessionDialogInputFeedback>({});

    if (!isEqual(prevMetadata, metadata)) {
        setPrevMetadata(metadata);
        setTitle(metadata.title);
        setDescription(metadata.description ?? "");
    }

    function handleSave() {
        if (title.trim() === "") {
            setInputFeedback((prev) => ({ ...prev, title: "Title is required." }));
            return;
        } else {
            setInputFeedback((prev) => ({ ...prev, title: undefined }));
        }

        props.workbench.getWorkbenchSession().updateMetadata({ title, description });
        props.workbench
            .saveCurrentSession()
            .then(() => {
                setInputFeedback({});
            })
            .catch((error) => {
                console.error("Failed to save session:", error);
            });
    }

    function handleCancel() {
        setEditSessionDialogOpen(false);
        setInputFeedback({});
    }

    const layout = props.workbench.getWorkbenchSession().getActiveDashboard()?.getLayout() || [];

    return (
        <Dialog
            open={editSessionDialogOpen}
            onClose={handleCancel}
            title="Edit session"
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
                    <Label text="Description (optional)">
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
