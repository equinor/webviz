import React from "react";

import { Add, Delete, Edit, FileOpen } from "@mui/icons-material";

import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dialog } from "@lib/components/Dialog";
import type { DialogProps } from "@lib/components/Dialog/dialog";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { SessionOverviewContent } from "./sessionOverviewContent";
import { SnapshotOverviewContent } from "./snapshotOverviewContent";

export type SessionOverviewDialogProps = {
    workbench: Workbench;
    contentMode: ModalContentMode;
    onNewSession?: () => void;
    onChangeModalMode?: (newMode: ModalContentMode) => void;
} & Pick<DialogProps, "open" | "onClose">;

export type ModalContentMode = "sessions" | "snapshots";

export function SessionOverviewDialog(props: SessionOverviewDialogProps): React.ReactNode {
    const [prevMode, setPrevMode] = React.useState(props.contentMode);
    const [selectedEntryId, setSelectedEntryId] = React.useState<string | null>(null);

    const [deletePending, setDeletePending] = React.useState<boolean>(false);
    const [entryEditOpen, setEntryEditOpen] = React.useState(false);

    if (props.contentMode !== prevMode) {
        setPrevMode(props.contentMode);
        setEntryEditOpen(false);
        setSelectedEntryId(null);
    }

    function editSelectedEntry() {
        if (!selectedEntryId) return;
        setEntryEditOpen(true);
    }

    function goToSelectedEntry() {
        if (!selectedEntryId) return;
        if (props.contentMode === "sessions") {
            props.workbench.openSession(selectedEntryId);
        } else {
            props.workbench.openSnapshot(selectedEntryId);
        }
    }

    async function deleteSelectedEntry() {
        if (!selectedEntryId || props.contentMode !== "sessions") return;

        setDeletePending(true);

        await props.workbench.deleteSession(selectedEntryId);

        setSelectedEntryId(null);
        setDeletePending(false);
    }

    const actions =
        props.contentMode === "sessions" ? (
            <>
                <Button color="danger" disabled={!selectedEntryId || deletePending} onClick={deleteSelectedEntry}>
                    {deletePending ? <CircularProgress size="small" /> : <Delete fontSize="inherit" />} Delete
                </Button>
                <Button color="primary" disabled={!selectedEntryId} onClick={editSelectedEntry}>
                    <Edit fontSize="inherit" /> Edit
                </Button>

                <Button color="primary" disabled={!selectedEntryId} onClick={goToSelectedEntry}>
                    <FileOpen fontSize="inherit" /> Open
                </Button>

                <Button color="primary" variant="contained" onClick={props.onNewSession}>
                    <Add fontSize="inherit" /> New session
                </Button>
            </>
        ) : (
            <>
                <Button color="primary" disabled={!selectedEntryId} onClick={goToSelectedEntry}>
                    <FileOpen fontSize="inherit" /> Open
                </Button>
            </>
        );

    return (
        <>
            <Dialog
                title={
                    // Padding an border sizes are a bit weird here; this is to align with the close-cross and modal heading border
                    <div className="-mb-4 font-bold text-lg flex items-end">
                        <button
                            className={resolveClassNames("-mb-[2px] px-2 pt-1 pb-2.5 hover:bg-blue-50 rounded-t", {
                                "border-blue-500 border-b-[3px]": props.contentMode === "sessions",
                                "text-gray-500 border-b-[3px] border-transparent hover:border-gray-200":
                                    props.contentMode !== "sessions",
                            })}
                            onClick={() => props.onChangeModalMode?.("sessions")}
                        >
                            Sessions
                        </button>
                        <button
                            className={resolveClassNames(
                                "-mb-[2px] px-2 pt-1 pb-2.5 hover:bg-blue-50 rounded-t ml-2 ",
                                {
                                    "border-blue-500 border-b-[3px]": props.contentMode === "snapshots",
                                    "text-gray-500 border-b-[3px] border-transparent hover:border-gray-200":
                                        props.contentMode !== "snapshots",
                                },
                            )}
                            onClick={() => props.onChangeModalMode?.("snapshots")}
                        >
                            Snapshots
                        </button>
                    </div>
                }
                modal
                {...props}
                actions={actions}
                width={1500}
                showCloseCross
            >
                {props.contentMode === "sessions" && (
                    <SessionOverviewContent
                        editOpen={entryEditOpen}
                        selectedSession={selectedEntryId}
                        workbench={props.workbench}
                        onSelectSession={setSelectedEntryId}
                        onEditClose={() => setEntryEditOpen(false)}
                    />
                )}

                {props.contentMode === "snapshots" && (
                    <SnapshotOverviewContent
                        editOpen={entryEditOpen}
                        selectedSession={selectedEntryId}
                        workbench={props.workbench}
                        onSelectSession={setSelectedEntryId}
                        onEditClose={() => setEntryEditOpen(false)}
                    />
                )}
            </Dialog>
        </>
    );
}
