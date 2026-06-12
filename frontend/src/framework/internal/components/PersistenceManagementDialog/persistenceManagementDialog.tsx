import type React from "react";

import { GuiState, useGuiState } from "@framework/GuiMessageBroker";
import { WorkbenchSessionManagerTopic } from "@framework/internal/WorkbenchSession/WorkbenchSessionManager";
import type { Workbench } from "@framework/Workbench";
import { Dialog } from "@lib/newComponents/Dialog";
import { Tabs } from "@lib/newComponents/Tabs";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

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
        <Dialog.Popup open={isDialogOpen} onOpenChange={setIsOpen} minWidth={800} width="80vw" height={700}>
            <div className="p-sm gap-y-md border-neutral-subtle flex items-start justify-between border-b-2 pb-0">
                <Tabs.Root
                    value={contentMode}
                    onValueChange={setContentMode}
                    orientation="horizontal"
                    layoutClassName="-mb-[2px]"
                >
                    <Tabs.List indicatorPosition="end">
                        <Tabs.Tab value="sessions">Sessions</Tabs.Tab>
                        <Tabs.Tab value="snapshots">Snapshots</Tabs.Tab>
                    </Tabs.List>
                </Tabs.Root>
                <Dialog.Close />
            </div>
            <Dialog.Body layoutClassName="h-full">
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
            </Dialog.Body>
        </Dialog.Popup>
    );
}
