import React from "react";

import type { Dashboard } from "@framework/internal/Dashboard";
import { DashboardTopic } from "@framework/internal/Dashboard";
import {
    MAX_DASHBOARD_DESCRIPTION_LENGTH,
    MAX_DASHBOARD_NAME_LENGTH,
    MIN_DASHBOARD_NAME_LENGTH,
} from "@framework/internal/persistence/constants";
import { AlertDialog } from "@lib/components/AlertDialog";
import { Button } from "@lib/components/Button";
import { Dialog } from "@lib/components/Dialog";
import { FieldCompositions } from "@lib/components/Field/compositions";
import { Form } from "@lib/components/Form";
import { TextArea } from "@lib/components/TextArea";
import { TextInput } from "@lib/components/TextInput";
import { Tooltip } from "@lib/components/Tooltip";
import { Typography } from "@lib/components/Typography";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

export type EditDashboardMetadataDialogProps = {
    dashboard: Dashboard;
    onClose: () => void;
};

export function EditDashboardMetadataDialog(props: EditDashboardMetadataDialogProps) {
    const { onClose } = props;

    const metadata = usePublishSubscribeTopicValue(props.dashboard, DashboardTopic.METADATA);

    const [name, setName] = React.useState(props.dashboard?.getMetadata().name || "");
    const [description, setDescription] = React.useState<string>(props.dashboard?.getMetadata().description ?? "");
    const [showConfirmationDialog, setShowConfirmationDialog] = React.useState<boolean>(false);

    const inputRef = React.useRef<HTMLInputElement>(null);
    const formId = React.useId();

    const handleSubmit = React.useCallback(
        function handleSubmit(event: React.FormEvent) {
            event.preventDefault();
            const trimmedLength = name.trim().length;
            if (trimmedLength < MIN_DASHBOARD_NAME_LENGTH || name.length > MAX_DASHBOARD_NAME_LENGTH) {
                inputRef.current?.focus();
                return;
            }

            // Not saved here - like any other dashboard edit, it's part of the session's unsaved changes
            props.dashboard.updateMetadata({ name, description });
            onClose();
        },
        [name, description, props.dashboard, onClose],
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
                            info={`Enter a descriptive name for your dashboard. This must be between ${MIN_DASHBOARD_NAME_LENGTH} and ${MAX_DASHBOARD_NAME_LENGTH} characters.`}
                            validationMode="onSubmit"
                        >
                            <TextInput
                                minLength={MIN_DASHBOARD_NAME_LENGTH}
                                maxLength={MAX_DASHBOARD_NAME_LENGTH}
                                ref={inputRef}
                                value={name}
                                onValueChange={(val) => setName(val)}
                                placeholder="Enter dashboard name"
                                autoFocus
                                required
                                endAdornment={
                                    <Tooltip
                                        content={`Your name is currently using ${name.length} out of the maximum ${MAX_DASHBOARD_NAME_LENGTH} characters.`}
                                    >
                                        <Typography
                                            size="sm"
                                            family="body"
                                            tone="neutral"
                                        >{`${name.length}/${MAX_DASHBOARD_NAME_LENGTH}`}</Typography>
                                    </Tooltip>
                                }
                            />
                        </FieldCompositions.Default>
                        <FieldCompositions.Default label="Description" indicator="(Optional)">
                            <TextArea
                                maxLength={MAX_DASHBOARD_DESCRIPTION_LENGTH}
                                value={description}
                                onValueChange={(val) => setDescription(val)}
                                placeholder="Enter dashboard description"
                                rows={3}
                                bottomAdornment={
                                    <Tooltip
                                        content={`Your description is currently using ${description.length} out of the maximum ${MAX_DASHBOARD_DESCRIPTION_LENGTH} characters.`}
                                    >
                                        <Typography
                                            size="sm"
                                            family="body"
                                            tone="neutral"
                                        >{`${description.length}/${MAX_DASHBOARD_DESCRIPTION_LENGTH}`}</Typography>
                                    </Tooltip>
                                }
                            />
                        </FieldCompositions.Default>
                    </Dialog.Body>
                    <Dialog.Actions>
                        <Button tone="neutral" variant="ghost" onClick={handleCancel}>
                            Cancel
                        </Button>
                        <Button type="submit" tone="accent">
                            Apply
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
