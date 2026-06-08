import React from "react";

import { GuiState, useGuiValue } from "@framework/GuiMessageBroker";
import { MAX_DESCRIPTION_LENGTH, MAX_TITLE_LENGTH, MIN_TITLE_LENGTH } from "@framework/internal/persistence/constants";
import { WorkbenchSessionManagerTopic } from "@framework/internal/WorkbenchSession/WorkbenchSessionManager";
import { type Workbench } from "@framework/Workbench";
import { AlertDialog } from "@lib/newComponents/AlertDialog";
import { Button } from "@lib/newComponents/Button";
import { CircularProgress } from "@lib/newComponents/CircularProgress";
import { Dialog } from "@lib/newComponents/Dialog";
import { FieldCompositions } from "@lib/newComponents/Field/compositions";
import { TextArea } from "@lib/newComponents/TextArea";
import { TextInput } from "@lib/newComponents/TextInput";
import { Tooltip } from "@lib/newComponents/Tooltip";
import { Typography } from "@lib/newComponents/Typography";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { truncateString } from "@lib/utils/strings";

import { DashboardPreview } from "../DashboardPreview/dashboardPreview";

export type EditSessionMetadataDialogProps = {
    workbench: Workbench;
    id: string | null;
    title: string;
    description?: string;
    open: boolean;
    onClose?: () => void;
};

export function EditSessionMetadataDialog(props: EditSessionMetadataDialogProps) {
    const hasActiveSession = usePublishSubscribeTopicValue(
        props.workbench.getSessionManager(),
        WorkbenchSessionManagerTopic.HAS_ACTIVE_SESSION,
    );

    const isSaving = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.IsSavingSession);

    const [title, setTitle] = React.useState<string>("");
    const [description, setDescription] = React.useState<string>("");
    const [showConfirmationDialog, setShowConfirmationDialog] = React.useState<boolean>(false);

    const [prevOriginalTitle, setPrevOriginalTitle] = React.useState<string>("");
    const [prevOriginalDescription, setPrevOriginalDescription] = React.useState<string>("");

    if (props.title !== prevOriginalTitle) {
        setPrevOriginalTitle(props.title);
        setTitle(`${truncateString(props.title, MAX_TITLE_LENGTH)}`);
    }
    if (props.description !== prevOriginalDescription) {
        setPrevOriginalDescription(props.description ?? "");
        setDescription(`${truncateString(props.description ?? "", MAX_DESCRIPTION_LENGTH)}`);
    }
    const inputRef = React.useRef<HTMLInputElement>(null);
    const formId = React.useId();

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

    function handleSave(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (title.trim() === "") {
            inputRef.current?.focus();
            return;
        }

        if (hasActiveSession) {
            const activeWorkbenchSession = props.workbench.getSessionManager().getActiveSession();
            if (activeWorkbenchSession && (activeWorkbenchSession.getId() === props.id || props.id === null)) {
                props.workbench.getSessionManager().getActiveSession().updateMetadata({ title, description });
                props.workbench
                    .getSessionManager()
                    .saveSession()
                    .then((result) => {
                        if (result) {
                            props.onClose?.();
                        }
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
            .getSessionManager()
            .updateSession(props.id, { title, description })
            .then((result) => {
                if (result) {
                    props.onClose?.();
                }
            })
            .catch((error) => {
                console.error("Failed to update session metadata:", error);
            });
    }

    function handleCancel() {
        if (title !== props.title || description !== props.description) {
            setShowConfirmationDialog(true);
            return;
        }
        handleDiscardChanges();
    }

    function handleDiscardChanges() {
        setTitle(props.title);
        setDescription(props.description ?? "");
        setPrevOriginalTitle("");
        setPrevOriginalDescription("");
        props.onClose?.();
    }

    const layout = hasActiveSession
        ? (props.workbench.getSessionManager().getActiveSession().getActiveDashboard()?.getLayout() ?? [])
        : [];

    return (
        <>
            <Dialog.Popup open={props.open} onOpenChange={handleCancel} modal width={600}>
                <Dialog.Header closeIconVisible>
                    <Dialog.Title>Edit session metadata</Dialog.Title>
                </Dialog.Header>
                <form id={formId} onSubmit={handleSave}>
                    <Dialog.Body layoutClassName="flex items-center gap-horizontal-sm">
                        <DashboardPreview height={220} width={150} layout={layout} />
                        <div className="gap-vertical-sm flex min-w-0 grow flex-col">
                            <FieldCompositions.Default
                                label="Title"
                                indicator="(Required)"
                                info={`Enter a descriptive title for your session, which will help you identify it later. This must be between ${MIN_TITLE_LENGTH} and ${MAX_TITLE_LENGTH} characters.`}
                                validationMode="onSubmit"
                            >
                                <TextInput
                                    minLength={MIN_TITLE_LENGTH}
                                    maxLength={MAX_TITLE_LENGTH}
                                    ref={inputRef}
                                    value={title}
                                    onValueChange={(val) => setTitle(val)}
                                    placeholder="Enter session title"
                                    autoFocus
                                    required
                                    endAdornment={
                                        <Tooltip
                                            content={`Your title is currently using ${title.length} out of the maximum ${MAX_TITLE_LENGTH} characters.`}
                                        >
                                            <Typography
                                                size="sm"
                                                family="body"
                                                tone="neutral"
                                            >{`${title.length}/${MAX_TITLE_LENGTH}`}</Typography>
                                        </Tooltip>
                                    }
                                />
                            </FieldCompositions.Default>
                            <FieldCompositions.Default label="Description" indicator="(Optional)">
                                <TextArea
                                    maxLength={MAX_DESCRIPTION_LENGTH}
                                    value={description}
                                    onValueChange={(val) => setDescription(val)}
                                    placeholder="Enter session description"
                                    rows={3}
                                    bottomAdornment={
                                        <Tooltip
                                            content={`Your descriptions is currently using ${description.length} out of the maximum ${MAX_DESCRIPTION_LENGTH} characters.`}
                                        >
                                            <Typography
                                                size="sm"
                                                family="body"
                                                tone="neutral"
                                            >{`${description.length}/${MAX_DESCRIPTION_LENGTH}`}</Typography>
                                        </Tooltip>
                                    }
                                />
                            </FieldCompositions.Default>
                        </div>
                    </Dialog.Body>
                    <Dialog.Actions>
                        <Button variant="ghost" tone="neutral" disabled={isSaving} onClick={handleCancel}>
                            Cancel
                        </Button>
                        <Button variant="contained" disabled={isSaving} type="submit" form={formId}>
                            {isSaving && <CircularProgress size={16} />} Save
                        </Button>
                    </Dialog.Actions>
                </form>
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
