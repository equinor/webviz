import React from "react";

import { Icon } from "@equinor/eds-core-react";
import { category, dashboard, folder_open, github, external_link, add } from "@equinor/eds-icons";

import { GuiState, useSetGuiState } from "@framework/GuiMessageBroker";
import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { Tooltip } from "@lib/components/Tooltip";
import Dialog from "@lib/newComponents/Dialog";
import { Heading } from "@lib/newComponents/Heading";
import { Paragraph } from "@lib/newComponents/Paragraph/paragraph";

import { RecentSessions } from "./private-components/recentSessions";
import { RecentSnapshots } from "./private-components/recentSnapshots";

Icon.add({ dashboard, category, folder_open, github, external_link, add });

export type StartPageProps = {
    workbench: Workbench;
};

export function StartPage(props: StartPageProps) {
    const [dialogOpen, setDialogOpen] = React.useState(false);

    const setShowOverviewDialog = useSetGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.SessionSnapshotOverviewDialogOpen,
    );
    const setOverviewContentMode = useSetGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.SessionSnapshotOverviewDialogMode,
    );

    const setIsOpenTemplatesDialog = useSetGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.TemplatesDialogOpen,
    );

    function handleNewSession() {
        props.workbench.getSessionManager().startNewSession();
    }

    function handleOpenTemplatesDialog() {
        setIsOpenTemplatesDialog(true);
    }

    function openOverviewDialogOnSessions() {
        setShowOverviewDialog(true);
        setOverviewContentMode("sessions");
    }

    return (
        <>
            <div className="flex h-full min-h-0 w-full items-center justify-center p-57">
                <div className="px-selectable-horizontal grid grid-cols-2 gap-x-4 gap-y-8">
                    <section className="flex flex-col gap-2">
                        <Heading as="h3">Start</Heading>
                        <Tooltip
                            placement="right"
                            title="Create a new free session and save it later on demand."
                            enterDelay="medium"
                        >
                            <Button variant="text" onClick={handleNewSession}>
                                <Icon name="category" />
                                New session
                            </Button>
                        </Tooltip>
                        <Tooltip placement="right" title="Open an existing session." enterDelay="medium">
                            <Button variant="text" onClick={openOverviewDialogOnSessions}>
                                <Icon name="folder_open" />
                                Open session or snapshot...
                            </Button>
                        </Tooltip>
                        <Tooltip
                            placement="right"
                            title="Start from a template to quickly set up a session with predefined settings and data."
                            enterDelay="medium"
                        >
                            <Button variant="text" onClick={handleOpenTemplatesDialog}>
                                <Icon name="dashboard" />
                                Start from template...
                            </Button>
                        </Tooltip>
                        <Button variant="text" onClick={() => setDialogOpen(true)}>
                            <Icon name="add" />
                            Create ensemble set...
                        </Button>
                        <Dialog.Popup open={dialogOpen} onOpenChange={setDialogOpen}>
                            <Dialog.Header isCloseIconVisible>
                                <Dialog.Title>Session and snapshot overview</Dialog.Title>
                            </Dialog.Header>
                            <Dialog.Content>
                                <Paragraph size="lg">This dialog is under construction.</Paragraph>
                            </Dialog.Content>
                            <Dialog.Actions>
                                <Button onClick={() => setDialogOpen(false)}>Close </Button>
                            </Dialog.Actions>
                        </Dialog.Popup>
                    </section>
                    <RecentSessions workbench={props.workbench} />
                    <section className="flex flex-col gap-4">
                        <Heading as="h3">Resources</Heading>
                        <a
                            href="https://github.com/equinor/webviz"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex w-max items-center gap-2 rounded px-4 py-2 font-medium text-indigo-600 hover:bg-indigo-100"
                        >
                            <Icon name="github" />
                            Webviz on GitHub
                            <Icon name="external_link" className="h-4" />
                        </a>
                    </section>
                    <RecentSnapshots workbench={props.workbench} />
                </div>
            </div>
        </>
    );
}
