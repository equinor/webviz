import React from "react";

import { GuiState, useGuiState, useGuiValue } from "@framework/GuiMessageBroker";
import { MAX_DESCRIPTION_LENGTH, MAX_TITLE_LENGTH } from "@framework/internal/persistence/constants";
import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { CharLimitedInput } from "@lib/components/CharLimitedInput/charLimitedInput";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dialog } from "@lib/components/Dialog";
import { truncateString } from "@lib/utils/strings";

import { useActiveSession } from "../ActiveSessionBoundary";
import { DashboardPreview } from "../DashboardPreview/dashboardPreview";

export type SaveSessionDialogProps = {
    workbench: Workbench;
};

type SaveSessionDialogInputFeedback = {
    title?: string;
};

export function SaveSessionDialog(props: SaveSessionDialogProps): React.ReactNode {
    const activeSession = useActiveSession();

    const originalTitle = activeSession.getMetadata().title;
    const originalDescription = activeSession.getMetadata().description ?? "";
    const isPersisted = activeSession.getIsPersisted();

    const [title, setTitle] = React.useState<string>("");
    const [description, setDescription] = React.useState<string>("");

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

    function handleSave() {
        if (title.trim() === "") {
            inputRef.current?.focus();
            return;
        }

        if (isPersisted) {
            // Save as new session (dialog opened via "Save As" button)
            props.workbench
                .getSessionManager()
                .saveAsNewSession(title, description)
                .catch((error) => {
                    console.error("Failed to save session as new:", error);
                });
        } else {
            // Regular save (first time saving)
            props.workbench.getSessionManager().getActiveSession().updateMetadata({ title, description });
            props.workbench
                .getSessionManager()
                .saveActiveSession(true)
                .catch((error) => {
                    console.error("Failed to save session:", error);
                });
        }
    }

    function handleCancel() {
        setIsOpen(false);
        setPrevOriginalTitle("");
        setPrevOriginalDescription("");
    }

    const inputFeedback: SaveSessionDialogInputFeedback = React.useMemo(() => {
        const feedback: SaveSessionDialogInputFeedback = {};
        if (title.trim() === "") {
            feedback.title = "Title is required.";
        }
        return feedback;
    }, [title]);

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
            <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded text-sm">
                Sessions are not guaranteed to persist, as underlying data or module states may change.
            </div>
            <div className="flex gap-4 items-center">
                <DashboardPreview height={100} width={100} layout={layout} />
                <div className="flex flex-col gap-2 grow min-w-0">
                    <CharLimitedInput
                        label="Title"
                        inputRef={inputRef}
                        placeholder="Enter session title"
                        type="text"
                        value={title}
                        onControlledValueChange={(value) => setTitle(value)}
                        maxLength={MAX_TITLE_LENGTH}
                        error={!!inputFeedback.title}
                        autoFocus
                    />
                    <div className="text-red-600 text-sm mb-1 h-4">{inputFeedback.title}</div>
                    <CharLimitedInput
                        label="Description (optional)"
                        maxLength={MAX_DESCRIPTION_LENGTH}
                        onControlledValueChange={(value) => setDescription(value)}
                        placeholder="Enter session description"
                        value={description}
                        multiline
                    />
                </div>
            </div>
        </Dialog>
    );
}
