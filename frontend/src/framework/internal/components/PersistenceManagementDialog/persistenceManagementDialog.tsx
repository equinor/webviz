import type React from "react";

import { GuiState, useGuiState } from "@framework/GuiMessageBroker";
import { WorkbenchSessionManagerTopic } from "@framework/internal/WorkbenchSession/WorkbenchSessionManager";
import type { Workbench } from "@framework/Workbench";
import { Dialog } from "@lib/newComponents/Dialog";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { SessionManagementContent } from "./sessionManagementContent";
import { SnapshotManagementContent } from "./snapshotManagementContent";

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
        <Dialog.Popup open={isDialogOpen} onOpenChange={setIsOpen} width={1200} height={700}>
            <Dialog.Header closeIconVisible>
                <div className="-mb-4 flex items-end text-lg font-bold">
                    <button
                        className={resolveClassNames("hover:bg-fill-accent-hover -mb-0.5 rounded-t px-2 pt-1 pb-1.5", {
                            "border-stroke-accent-strong border-b-[3px]": contentMode === "sessions",
                            "border-b-[3px] border-transparent text-gray-500 hover:border-gray-200":
                                contentMode !== "sessions",
                        })}
                        onClick={() => setContentMode("sessions")}
                    >
                        Sessions
                    </button>
                    <button
                        className={resolveClassNames(
                            "hover:bg-fill-accent-hover -mb-0.5 ml-2 rounded-t px-2 pt-1 pb-1.5",
                            {
                                "border-stroke-accent-strong border-b-[3px]": contentMode === "snapshots",
                                "border-b-[3px] border-transparent text-gray-500 hover:border-gray-200":
                                    contentMode !== "snapshots",
                            },
                        )}
                        onClick={() => setContentMode("snapshots")}
                    >
                        Snapshots
                    </button>
                </div>
            </Dialog.Header>
            <Dialog.Content>
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
            </Dialog.Content>
        </Dialog.Popup>
    );
}
