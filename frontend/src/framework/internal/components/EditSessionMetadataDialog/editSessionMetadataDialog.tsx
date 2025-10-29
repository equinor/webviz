import React from "react";

import { GuiState, useGuiValue } from "@framework/GuiMessageBroker";
import { WorkbenchTopic, type Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dialog } from "@lib/components/Dialog";
import { TextLengthControlledInput } from "@lib/components/InputTextLengthController/inputTextLengthController";
import { Label } from "@lib/components/Label";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import { DashboardPreview } from "../DashboardPreview/dashboardPreview";

export type EditSessionMetadataDialogProps = {
    workbench: Workbench;
    id: string | null;
    title: string;
    description?: string;
    open: boolean;
    onClose?: () => void;
};

type EditSessionDialogInputFeedback = {
    title?: string;
    description?: string;
};

export function EditSessionMetadataDialog(props: EditSessionMetadataDialogProps): React.ReactNode {
    const hasActiveSession = usePublishSubscribeTopicValue(props.workbench, WorkbenchTopic.HAS_ACTIVE_SESSION);
    const isSaving = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.IsSavingSession);

    const [title, setTitle] = React.useState<string>(props.title);
    const [description, setDescription] = React.useState<string>(props.description ?? "");
    const [inputFeedback, setInputFeedback] = React.useState<EditSessionDialogInputFeedback>({});

    const [prevTitle, setPrevTitle] = React.useState<string>(props.title);
    const [prevDescription, setPrevDescription] = React.useState<string>(props.description ?? "");

    if (prevTitle !== props.title) {
        setPrevTitle(props.title);
        setTitle(props.title);
    }

    if (prevDescription !== props.description) {
        setPrevDescription(props.description ?? "");
        setDescription(props.description ?? "");
    }

    function handleSave() {
        if (title.trim() === "") {
            setInputFeedback((prev) => ({ ...prev, title: "Title is required." }));
            return;
        } else {
            setInputFeedback((prev) => ({ ...prev, title: undefined }));
        }

        if (hasActiveSession) {
            const activeWorkbenchSession = props.workbench.getWorkbenchSession();
            if (activeWorkbenchSession && (activeWorkbenchSession.getId() === props.id || props.id === null)) {
                props.workbench.getWorkbenchSession().updateMetadata({ title, description });
                props.workbench
                    .saveCurrentSession()
                    .then(() => {
                        setInputFeedback({});
                    })
                    .catch((error) => {
                        console.error("Failed to save session:", error);
                    });
                return;
            }
        }

        if (props.id === null) {
            console.error("Cannot update session metadata: session ID is null");
            return;
        }

        props.workbench
            .updateSession(props.id, { title, description })
            .then((result) => {
                setInputFeedback({});
                if (result) {
                    props.onClose?.();
                }
            })
            .catch((error) => {
                console.error("Failed to update session metadata:", error);
            });
    }

    function handleCancel() {
        setInputFeedback({});
        props.onClose?.();
    }

    const layout = hasActiveSession
        ? (props.workbench.getWorkbenchSession().getActiveDashboard().getLayout() ?? [])
        : [];

    return (
        <Dialog
            open={props.open}
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
            zIndex={60}
        >
            <div className="flex gap-4 items-center">
                <DashboardPreview height={100} width={100} layout={layout} />
                <div className="flex flex-col gap-2 grow min-w-0">
                    <Label text="Title">
                        <>
                            <TextLengthControlledInput
                                onControlledValueChange={(value) => setTitle(value)}
                                maxLength={30}
                                placeholder="Enter session title"
                                type="text"
                                value={title}
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
                            <TextLengthControlledInput
                                maxLength={250}
                                onControlledValueChange={(value) => setDescription(value)}
                                placeholder="Enter session description"
                                value={description}
                                multiline
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
