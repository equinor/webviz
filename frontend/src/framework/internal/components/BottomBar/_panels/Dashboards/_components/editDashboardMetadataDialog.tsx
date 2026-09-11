import React from "react";

import { GuiState, useGuiValue } from "@framework/GuiMessageBroker";
import type { Dashboard } from "@framework/internal/Dashboard";
import { DashboardTopic } from "@framework/internal/Dashboard";
import { MAX_DESCRIPTION_LENGTH, MAX_TITLE_LENGTH, MIN_TITLE_LENGTH } from "@framework/internal/persistence/constants";
import type { Workbench } from "@framework/Workbench";
import { AlertDialog } from "@lib/components/AlertDialog";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dialog } from "@lib/components/Dialog";
import { FieldCompositions } from "@lib/components/Field/compositions";
import { Form } from "@lib/components/Form";
import { TextArea } from "@lib/components/TextArea";
import { TextInput } from "@lib/components/TextInput";
import { Tooltip } from "@lib/components/Tooltip";
import { Typography } from "@lib/components/Typography";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import { useActiveSession } from "../../../../ActiveSessionBoundary";

export type EditDashboardMetadataDialogProps = {
    workbench: Workbench;
    dashboard: Dashboard;
    onClose: () => void;
};

export function EditDashboardMetadataDialog(props: EditDashboardMetadataDialogProps) {
    const { onClose } = props;
    const workbenchSession = useActiveSession();

    const metadata = usePublishSubscribeTopicValue(props.dashboard, DashboardTopic.METADATA);
    const isSaving = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.IsSavingSession);

    const [name, setName] = React.useState(props.dashboard?.getMetadata().name || "");
    const [description, setDescription] = React.useState<string>(props.dashboard?.getMetadata().description ?? "");
    const [showConfirmationDialog, setShowConfirmationDialog] = React.useState<boolean>(false);

    const inputRef = React.useRef<HTMLInputElement>(null);
    const formId = React.useId();

    const handleSubmit = React.useCallback(
        function handleSubmit(event: React.FormEvent) {
            event.preventDefault();
            if (name.trim() === "") {
                inputRef.current?.focus();
                return;
            }

            if (workbenchSession) {
                props.dashboard.updateMetadata({ name, description });
                props.workbench
                    .getSessionManager()
                    .saveSession()
                    .then((result) => {
                        if (result) {
                            onClose?.();
                        }
                    })
                    .catch((error) => {
                        console.error("Failed to save session:", error);
                    });
                return;
            }
        },
        [name, description, props.dashboard, props.workbench, workbenchSession, onClose],
    );

    function handleCancel() {
        if (name !== metadata.name || description !== (metadata.description ?? "")) {
            setShowConfirmationDialog(true);
            return;
        }
        handleDiscardChanges();
    }

    function handleDiscardChanges() {
        setName(metadata.name);
        setDescription(metadata.description ?? "");
        props.onClose?.();
    }

    return (
        <>
            <Dialog.Popup open={true} onOpenChange={handleCancel} minWidth={400}>
                <Dialog.Header closeIconVisible>
                    <Dialog.Title>Edit dashboard metadata</Dialog.Title>
                </Dialog.Header>
                <Form onSubmit={handleSubmit} id={formId}>
                    <Dialog.Body layoutClassName="flex flex-col gap-y-sm">
                        <FieldCompositions.Default
                            label="Name"
                            indicator="(Required)"
                            info={`Enter a descriptive name for your dashboard. This must be between ${MIN_TITLE_LENGTH} and ${MAX_TITLE_LENGTH} characters.`}
                            validationMode="onSubmit"
                        >
                            <TextInput
                                minLength={MIN_TITLE_LENGTH}
                                maxLength={MAX_TITLE_LENGTH}
                                ref={inputRef}
                                value={name}
                                onValueChange={(val) => setName(val)}
                                placeholder="Enter dashboard name"
                                autoFocus
                                required
                                endAdornment={
                                    <Tooltip
                                        content={`Your name is currently using ${name.length} out of the maximum ${MAX_TITLE_LENGTH} characters.`}
                                    >
                                        <Typography
                                            size="sm"
                                            family="body"
                                            tone="neutral"
                                        >{`${name.length}/${MAX_TITLE_LENGTH}`}</Typography>
                                    </Tooltip>
                                }
                            />
                        </FieldCompositions.Default>
                        <FieldCompositions.Default label="Description" indicator="(Optional)">
                            <TextArea
                                maxLength={MAX_DESCRIPTION_LENGTH}
                                value={description}
                                onValueChange={(val) => setDescription(val)}
                                placeholder="Enter dashboard description"
                                rows={3}
                                bottomAdornment={
                                    <Tooltip
                                        content={`Your description is currently using ${description.length} out of the maximum ${MAX_DESCRIPTION_LENGTH} characters.`}
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
                    </Dialog.Body>
                    <Dialog.Actions>
                        <Button tone="neutral" variant="ghost" onClick={handleCancel} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button type="submit" tone="accent" disabled={isSaving} onClick={handleSubmit}>
                            {isSaving ? <CircularProgress size="em" /> : "Save"}
                        </Button>
                    </Dialog.Actions>
                </Form>
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
