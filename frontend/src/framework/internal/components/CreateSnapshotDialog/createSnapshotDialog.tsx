import React from "react";

import { GuiState, useGuiState, useGuiValue } from "@framework/GuiMessageBroker";
import { buildSnapshotUrl } from "@framework/internal/WorkbenchSession/SnapshotUrlService";
import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dialog } from "@lib/components/Dialog";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { AddLink } from "@mui/icons-material";

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

    const isSaving = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.IsSavingSession);

    const [title, setTitle] = React.useState<string>("");
    const [description, setDescription] = React.useState<string>("");
    const [snapshotUrl, setSnapshotUrl] = React.useState<string | null>(null);
    const [inputFeedback, setInputFeedback] = React.useState<MakeSnapshotDialogInputFeedback>({});
    const inputRef = React.useRef<HTMLInputElement>(null);

    function handleCreateSnapshot() {
        if (title.trim() === "") {
            setInputFeedback((prev) => ({ ...prev, title: "Title is required." }));
            return;
        } else {
            setInputFeedback((prev) => ({ ...prev, title: undefined }));
        }

        props.workbench
            .makeSnapshot(title, description)
            .then((snapshotId) => {
                if (!snapshotId) {
                    return;
                }
                setTitle("");
                setDescription("");
                setInputFeedback({});
                if (!snapshotId) {
                    return;
                }
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

    const layout = props.workbench.getWorkbenchSession().getActiveDashboard()?.getLayout() || [];

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
                            <Input
                                inputRef={inputRef}
                                placeholder="Enter snapshot title"
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
                    <Label text="Description">
                        <>
                            <Input
                                placeholder="Enter snapshot description"
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
        );

        actions = (
            <>
                <Button variant="text" disabled={isSaving} onClick={handleCancel}>
                    Cancel
                </Button>
                <Button variant="text" disabled={isSaving} onClick={handleCreateSnapshot}>
                    {isSaving && <CircularProgress size="small" />}
                    <AddLink fontSize="inherit" /> Make link
                </Button>
            </>
        );
    } else {
        content = (
            <div className="flex flex-col gap-2">
                <div className="text-green-600 text-lg font-bold">Snapshot created successfully!</div>
                <div className="text-sm">You can share this link:</div>
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
