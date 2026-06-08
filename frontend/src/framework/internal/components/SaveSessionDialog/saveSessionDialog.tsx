import React from "react";

import { GuiState, useGuiState, useGuiValue } from "@framework/GuiMessageBroker";
import { MAX_DESCRIPTION_LENGTH, MAX_TITLE_LENGTH, MIN_TITLE_LENGTH } from "@framework/internal/persistence/constants";
import type { Workbench } from "@framework/Workbench";
import { AlertDialog } from "@lib/newComponents/AlertDialog";
import { Banner } from "@lib/newComponents/Banner";
import { Button } from "@lib/newComponents/Button";
import { CircularProgress } from "@lib/newComponents/CircularProgress";
import { Dialog } from "@lib/newComponents/Dialog";
import { FieldCompositions } from "@lib/newComponents/Field/compositions";
import { TextArea } from "@lib/newComponents/TextArea";
import { TextInput } from "@lib/newComponents/TextInput";
import { Tooltip } from "@lib/newComponents/Tooltip";
import { Typography } from "@lib/newComponents/Typography";
import { truncateString } from "@lib/utils/strings";

import { useActiveSession } from "../ActiveSessionBoundary";
import { DashboardPreview } from "../DashboardPreview/dashboardPreview";

export type SaveSessionDialogProps = {
    workbench: Workbench;
    saveAsNew?: boolean;
};

export function SaveSessionDialog(props: SaveSessionDialogProps): React.ReactNode {
    const activeSession = useActiveSession();

    const originalTitle = activeSession.getMetadata().title;
    const originalDescription = activeSession.getMetadata().description ?? "";

    const [title, setTitle] = React.useState<string>("");
    const [description, setDescription] = React.useState<string>("");
    const [showConfirmationDialog, setShowConfirmationDialog] = React.useState<boolean>(false);

    const [prevOriginalTitle, setPrevOriginalTitle] = React.useState<string>("");
    const [prevOriginalDescription, setPrevOriginalDescription] = React.useState<string>("");

    if (originalTitle !== prevOriginalTitle) {
        setPrevOriginalTitle(originalTitle);
        setTitle(`${truncateString(originalTitle, MAX_TITLE_LENGTH)}`);
    }
    if (originalDescription !== prevOriginalDescription) {
        setPrevOriginalDescription(originalDescription);
        setDescription(originalDescription);
    }

    const [isOpen, setIsOpen] = useGuiState(props.workbench.getGuiMessageBroker(), GuiState.SaveSessionDialogOpen);
    const isSaving = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.IsSavingSession);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const formId = React.useId();

    function handleSave(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        if (title.trim() === "") {
            inputRef.current?.focus();
            return;
        }

        props.workbench.getSessionManager().getActiveSession().updateMetadata({ title, description });
        props.workbench
            .getSessionManager()
            .saveSession({ saveAsNew: props.saveAsNew })
            .then((success) => setIsOpen(!success));
    }

    function handleCancel() {
        if (title !== originalTitle || description !== originalDescription) {
            setShowConfirmationDialog(true);
            return;
        }
        handleDiscardChanges();
    }

    function handleDiscardChanges() {
        setPrevOriginalTitle("");
        setPrevOriginalDescription("");
        setIsOpen(false);
    }

    React.useEffect(
        function focusInput() {
            if (isOpen && inputRef.current) {
                inputRef.current.focus();
            }
        },
        [isOpen],
    );

    const layout = props.workbench.getSessionManager().getActiveSession().getActiveDashboard()?.getLayout() || [];

    return (
        <>
            <Dialog.Popup open={isOpen} onOpenChange={handleCancel} modal width={600}>
                <Dialog.Header closeIconVisible>
                    <Dialog.Title>{props.saveAsNew ? "Save session as ..." : "Save session"}</Dialog.Title>
                </Dialog.Header>
                <Dialog.Body>
                    <Banner tone="warning" layoutClassName="mb-vertical-2xs">
                        Sessions are not guaranteed to persist, as underlying data or module states may change.
                    </Banner>
                    <form id={formId} className="gap-horizontal-sm flex items-center" onSubmit={handleSave}>
                        <DashboardPreview height={220} width={150} layout={layout} />
                        <div className="gap-vertical-sm flex min-w-0 grow flex-col">
                            <FieldCompositions.Default
                                label="Title"
                                indicator="(Required)"
                                info={`Enter a descriptive title for your session, which will help you identify it later. This must be between ${MIN_TITLE_LENGTH} and ${MAX_TITLE_LENGTH} characters.`}
                            >
                                <TextInput
                                    minLength={MIN_TITLE_LENGTH}
                                    maxLength={MAX_TITLE_LENGTH}
                                    ref={inputRef}
                                    value={title}
                                    onValueChange={(value) => setTitle(value)}
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
                                <FieldCompositions.GenericErrors />
                            </FieldCompositions.Default>
                            <FieldCompositions.Default label="Description" indicator="(Optional)">
                                <TextArea
                                    maxLength={MAX_DESCRIPTION_LENGTH}
                                    value={description}
                                    onValueChange={(value) => setDescription(value)}
                                    placeholder="Enter session description"
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
                        </div>
                    </form>
                </Dialog.Body>
                <Dialog.Actions>
                    <Button variant="ghost" tone="neutral" disabled={isSaving} onClick={handleCancel}>
                        Cancel
                    </Button>
                    <Button tone="accent" disabled={isSaving} type="submit" form={formId}>
                        {isSaving && <CircularProgress size={16} />} Save
                    </Button>
                </Dialog.Actions>
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
