import React from "react";

import { GuiState, useGuiValue } from "@framework/GuiMessageBroker";
import { MAX_DESCRIPTION_LENGTH, MAX_TITLE_LENGTH } from "@framework/internal/persistence/constants";
import { WorkbenchSessionManagerTopic } from "@framework/internal/WorkbenchSession/WorkbenchSessionManager";
import { type Workbench } from "@framework/Workbench";
import { Button } from "@lib/newComponents/Button";
import { CharLimitedInput } from "@lib/components/CharLimitedInput/charLimitedInput";
import { CircularProgress } from "@lib/components/CircularProgress";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { truncateString } from "@lib/utils/strings";

import { DashboardPreview } from "../DashboardPreview/dashboardPreview";
import { Dialog } from "@lib/newComponents/Dialog";

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
};

export function EditSessionMetadataDialog(props: EditSessionMetadataDialogProps) {
    const hasActiveSession = usePublishSubscribeTopicValue(
        props.workbench.getSessionManager(),
        WorkbenchSessionManagerTopic.HAS_ACTIVE_SESSION,
    );

    const isSaving = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.IsSavingSession);

    const [title, setTitle] = React.useState<string>("");
    const [description, setDescription] = React.useState<string>("");

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
        setPrevOriginalTitle("");
        setPrevOriginalDescription("");
        props.onClose?.();
    }

    const inputFeedback: EditSessionDialogInputFeedback = React.useMemo(() => {
        const feedback: EditSessionDialogInputFeedback = {};
        if (title.trim() === "") {
            feedback.title = "Title is required.";
        }
        return feedback;
    }, [title]);

    const layout = hasActiveSession
        ? (props.workbench.getSessionManager().getActiveSession().getActiveDashboard()?.getLayout() ?? [])
        : [];

    React.useEffect(
        function focusInput() {
            if (props.open && inputRef.current) {
                inputRef.current.focus();
            }
        },
        [props.open],
    );

    return (
        <Dialog.Popup open={props.open} onOpenChange={handleCancel} modal width={600}>
            <Dialog.Header closeIconVisible>
                <Dialog.Title>Edit session metadata</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body layoutClassName="flex items-center gap-4">
                <DashboardPreview height={100} width={100} layout={layout} />
                <div className="flex min-w-0 grow flex-col gap-2">
                    <CharLimitedInput
                        label="Title"
                        onControlledValueChange={(value) => setTitle(value)}
                        maxLength={MAX_TITLE_LENGTH}
                        inputRef={inputRef}
                        placeholder="Enter session title"
                        type="text"
                        value={title}
                        error={!!inputFeedback.title}
                        autoFocus
                        required
                    />
                    <div className="mb-1 h-4 text-sm text-red-600">{inputFeedback.title}</div>
                    <CharLimitedInput
                        label="Description (optional)"
                        maxLength={MAX_DESCRIPTION_LENGTH}
                        onControlledValueChange={(value) => setDescription(value)}
                        placeholder="Enter session description"
                        value={description}
                        multiline
                    />
                </div>
            </Dialog.Body>
            <Dialog.Actions>
                <Button variant="text" disabled={isSaving} onClick={handleCancel}>
                    Cancel
                </Button>
                <Button variant="contained" disabled={isSaving} type="submit" form={formId}>
                    {isSaving && <CircularProgress size="small" />} Save
                </Button>
            </Dialog.Actions>
        </Dialog.Popup>
    );
}
