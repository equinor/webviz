import { Icon } from "@equinor/eds-core-react";
import { category, dashboard, folder_open, github, external_link, add } from "@equinor/eds-icons";

import { GuiState, useSetGuiState } from "@framework/GuiMessageBroker";
import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/newComponents/Button";
import { Tooltip } from "@lib/newComponents/Tooltip";
import { Heading } from "@lib/newComponents/Typography/compositions";

import { RecentSessions } from "./private-components/recentSessions";
import { RecentSnapshots } from "./private-components/recentSnapshots";

Icon.add({ dashboard, category, folder_open, github, external_link, add });

export type StartPageProps = {
    workbench: Workbench;
};

export function StartPage(props: StartPageProps) {
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
            <div className="flex h-full min-h-0 w-full items-center justify-center">
                <div className="px-selectable-horizontal gap-x-3xl gap-y-3xl grid grid-cols-2">
                    <section className="gap-y-xs flex flex-col">
                        <Heading as="h3">Start</Heading>
                        <Tooltip
                            side="right"
                            content="Create a new free session and save it later on demand."
                            delay="medium"
                        >
                            <Button variant="ghost" onClick={handleNewSession}>
                                <Icon name="category" fontSize="inherit" />
                                New session
                            </Button>
                        </Tooltip>
                        <Tooltip side="right" content="Open an existing session." delay="medium">
                            <Button variant="ghost" onClick={openOverviewDialogOnSessions}>
                                <Icon name="folder_open" fontSize="inherit" />
                                Open session or snapshot...
                            </Button>
                        </Tooltip>
                        <Tooltip
                            side="right"
                            content="Start from a template to quickly set up a session with predefined settings and data."
                            delay="medium"
                        >
                            <Button variant="ghost" onClick={handleOpenTemplatesDialog}>
                                <Icon name="dashboard" fontSize="inherit" />
                                Start from template...
                            </Button>
                        </Tooltip>
                    </section>
                    <RecentSessions workbench={props.workbench} />
                    <section className="gap-y-sm flex flex-col">
                        <Heading as="h3">Resources</Heading>

                        <Button.AsLink
                            href="https://github.com/equinor/webviz"
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="ghost"
                            tone="accent"
                            external
                        >
                            <Icon name="github" fontSize="inherit" />
                            Webviz on GitHub
                        </Button.AsLink>
                    </section>
                    <RecentSnapshots workbench={props.workbench} />
                </div>
            </div>
        </>
    );
}
