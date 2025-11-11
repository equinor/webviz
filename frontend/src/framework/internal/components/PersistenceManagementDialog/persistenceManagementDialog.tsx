import type React from "react";

import { GuiState, useGuiState } from "@framework/GuiMessageBroker";
import type { Workbench } from "@framework/Workbench";
import { Dialog } from "@lib/components/Dialog";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { SessionManagementContent } from "./sessionManagementContent";
import { SnapshotManagementContent } from "./snapshotManagementContent";
import { WorkbenchSessionManagerTopic } from "@framework/internal/WorkbenchSession/WorkbenchSessionManager";

export type PersistenceManagementDialogProps = {
    workbench: Workbench;
};

export type ModalContentMode = "sessions" | "snapshots";

export function PersistenceManagementDialog(props: PersistenceManagementDialogProps): React.ReactNode {
    const [isOpen, setIsOpen] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.SessionSnapshotOverviewDialogOpen,
    );
    const hasActiveSession = usePublishSubscribeTopicValue(
        props.workbench.getSessionManager(),
        WorkbenchSessionManagerTopic.HAS_ACTIVE_SESSION,
    );

    const [contentMode, setContentMode] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.SessionSnapshotOverviewDialogMode,
    );

    const isDialogOpen = isOpen && !hasActiveSession;

    return (
        <Dialog
            title={
                // Padding an border sizes are a bit weird here; this is to align with the close-cross and modal heading border
                <div className="-mb-4 font-bold text-lg flex items-end">
                    <button
                        className={resolveClassNames("-mb-[2px] px-2 pt-1 pb-2.5 hover:bg-blue-50 rounded-t", {
                            "border-blue-500 border-b-[3px]": contentMode === "sessions",
                            "text-gray-500 border-b-[3px] border-transparent hover:border-gray-200":
                                contentMode !== "sessions",
                        })}
                        onClick={() => setContentMode("sessions")}
                    >
                        Sessions
                    </button>
                    <button
                        className={resolveClassNames("-mb-[2px] px-2 pt-1 pb-2.5 hover:bg-blue-50 rounded-t ml-2 ", {
                            "border-blue-500 border-b-[3px]": contentMode === "snapshots",
                            "text-gray-500 border-b-[3px] border-transparent hover:border-gray-200":
                                contentMode !== "snapshots",
                        })}
                        onClick={() => setContentMode("snapshots")}
                    >
                        Snapshots
                    </button>
                </div>
            }
            modal
            open={isDialogOpen}
            onClose={() => setIsOpen(false)}
            width={1500}
            showCloseCross
            height={700}
        >
            {contentMode === "sessions" && (
                <SessionManagementContent
                    workbench={props.workbench}
                    active={isDialogOpen && contentMode === "sessions"}
                />
            )}
            {contentMode === "snapshots" && (
                <SnapshotManagementContent
                    workbench={props.workbench}
                    active={isDialogOpen && contentMode === "snapshots"}
                />
            )}
        </Dialog>
    );
}
