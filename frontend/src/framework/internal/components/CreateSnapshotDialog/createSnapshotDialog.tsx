import React from "react";

import { AddLink } from "@mui/icons-material";

import { GuiState, useGuiState, useGuiValue } from "@framework/GuiMessageBroker";
import { MAX_DESCRIPTION_LENGTH, MAX_TITLE_LENGTH } from "@framework/internal/persistence/constants";
import { buildSnapshotUrl } from "@framework/internal/WorkbenchSession/utils/url";
import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { CharLimitedInput } from "@lib/components/CharLimitedInput/charLimitedInput";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dialog } from "@lib/components/Dialog";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";

import { DashboardPreview } from "../DashboardPreview/dashboardPreview";

export type MakeSnapshotDialogProps = {
    workbench: Workbench;
};

type MakeSnapshotDialogInputFeedback = {
    title?: string;
    description?: string;
};

export function CreateSnapshotDialog(props: MakeSnapshotDialogProps): React.ReactNode {
    const [isOpen, setIsOpen] = useGuiState(props.workbench.getGuiMessageBroker(), GuiState.MakeSnapshotDialogOpen);

    const isSaving = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.IsMakingSnapshot);

    const [title, setTitle] = React.useState<string>("");
    const [description, setDescription] = React.useState<string>("");
    const [snapshotUrl, setSnapshotUrl] = React.useState<string | null>(null);
    const [inputFeedback, setInputFeedback] = React.useState<MakeSnapshotDialogInputFeedback>({});

    const inputRef = React.useRef<HTMLInputElement>(null);

    function handleCreateSnapshot() {
        if (title.trim() === "") {
            setInputFeedback((prev) => ({ ...prev, title: "Title is required." }));
            inputRef.current?.focus();
            return;
        } else {
            setInputFeedback((prev) => ({ ...prev, title: undefined }));
        }

        props.workbench
            .getSessionManager()
            .createSnapshot(title, description)
            .then((snapshotId) => {
                if (!snapshotId) {
                    return;
                }
                setTitle("");
                setDescription("");
                setInputFeedback({});
                setSnapshotUrl(buildSnapshotUrl(snapshotId));
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
        setSnapshotUrl(null);
    }

    const layout = props.workbench.getSessionManager().getActiveSession().getActiveDashboard()?.getLayout() || [];

    let content: React.ReactNode = null;
    let actions: React.ReactNode = null;

    React.useEffect(
        function focusInput() {
            if (isOpen && inputRef.current && !snapshotUrl) {
                inputRef.current.focus();
            }
        },
        [isOpen, snapshotUrl],
    );

    if (!snapshotUrl) {
        content = (
            <div className="flex gap-4 items-center">
                <DashboardPreview height={100} width={100} layout={layout} />
                <div className="flex flex-col gap-2 grow min-w-0">
                    <Label text="Title">
                        <>
                            <CharLimitedInput
                                onControlledValueChange={(value) => setTitle(value)}
                                maxLength={MAX_TITLE_LENGTH}
                                inputRef={inputRef}
                                placeholder="Enter snapshot title"
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
                    <Label text="Description">
                        <>
                            <CharLimitedInput
                                maxLength={MAX_DESCRIPTION_LENGTH}
                                onControlledValueChange={(value) => setDescription(value)}
                                placeholder="Enter snapshot description"
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
        );

        actions = (
            <>
                <Button variant="text" disabled={isSaving} onClick={handleCancel}>
                    Cancel
                </Button>
                <Button variant="text" color="success" disabled={isSaving} onClick={handleCreateSnapshot}>
                    {isSaving && <CircularProgress size="small" />}
                    <AddLink fontSize="inherit" /> Create snapshot
                </Button>
            </>
        );
    } else {
        content = (
            <div className="flex flex-col gap-4">
                <div className="text-green-600 text-lg font-bold">Snapshot created successfully!</div>
                <div className="text-sm">
                    By sharing the following link you can give others access to your snapshot. <br />
                    You can find all your created and visited snapshots in the snapshots dialog.
                </div>
                <Input
                    type="text"
                    value={snapshotUrl}
                    readOnly
                    className="w-full"
                    endAdornment={
                        <Button variant="text" onClick={() => navigator.clipboard.writeText(snapshotUrl || "")}>
                            Copy
                        </Button>
                    }
                />
            </div>
        );

        actions = (
            <>
                <Button variant="text" disabled={isSaving} onClick={handleCancel}>
                    Close
                </Button>
            </>
        );
    }

    return (
        <Dialog open={isOpen} onClose={handleCancel} title="Create Snapshot" modal showCloseCross actions={actions}>
            {content}
        </Dialog>
    );
}
