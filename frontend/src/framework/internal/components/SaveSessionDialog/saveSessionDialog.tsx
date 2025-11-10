import React from "react";

import { GuiState, useGuiState, useGuiValue } from "@framework/GuiMessageBroker";
import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { CharLimitedInput } from "@lib/components/CharLimitedInput/charLimitedInput";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dialog } from "@lib/components/Dialog";
import { Label } from "@lib/components/Label";

import { DashboardPreview } from "../DashboardPreview/dashboardPreview";
import { MAX_DESCRIPTION_LENGTH, MAX_TITLE_LENGTH } from "@framework/internal/persistence/constants";

export type SaveSessionDialogProps = {
    workbench: Workbench;
};

type SaveSessionDialogInputFeedback = {
    title?: string;
    description?: string;
};

export function SaveSessionDialog(props: SaveSessionDialogProps): React.ReactNode {
    const [isOpen, setIsOpen] = useGuiState(props.workbench.getGuiMessageBroker(), GuiState.SaveSessionDialogOpen);
    const isSaving = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.IsSavingSession);
    const [title, setTitle] = React.useState<string>("");
    const [description, setDescription] = React.useState<string>("");
    const [inputFeedback, setInputFeedback] = React.useState<SaveSessionDialogInputFeedback>({});
    const inputRef = React.useRef<HTMLInputElement>(null);

    function handleSave() {
        if (title.trim() === "") {
            setInputFeedback((prev) => ({ ...prev, title: "Title is required." }));
            return;
        } else {
            setInputFeedback((prev) => ({ ...prev, title: undefined }));
        }

        props.workbench.getSessionManager().getActiveSession().updateMetadata({ title, description });
        props.workbench
            .getSessionManager()
            .saveActiveSession(true)
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
        setIsOpen(false);
        setTitle("");
        setDescription("");
        setInputFeedback({});
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
        <Dialog
            open={isOpen}
            onClose={handleCancel}
            title="Save Session as ..."
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
                            <CharLimitedInput
                                inputRef={inputRef}
                                placeholder="Enter session title"
                                type="text"
                                value={title}
                                onControlledValueChange={(value) => setTitle(value)}
                                maxLength={MAX_TITLE_LENGTH}
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
                            <CharLimitedInput
                                maxLength={MAX_DESCRIPTION_LENGTH}
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
