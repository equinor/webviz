import { Icon } from "@equinor/eds-core-react";
import { category, dashboard, folder_open, github, external_link, add } from "@equinor/eds-icons";

import { GuiState, useSetGuiState } from "@framework/GuiMessageBroker";
import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { Tooltip } from "@lib/components/Tooltip";
import { Combobox } from "@lib/newComponents/Combobox";
import { Heading } from "@lib/newComponents/Heading";

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
            <div className="flex h-full min-h-0 w-full items-center justify-center p-57">
                <div className="px-selectable-horizontal gap-x-horizontal-3xl gap-y-vertical-sm grid grid-cols-2">
                    <section className="gap-vertical-xs flex flex-col">
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
                    </section>
                    <RecentSessions workbench={props.workbench} />
                    <section className="gap-vertical-sm flex flex-col">
                        <Heading as="h3">Resources</Heading>
                        <a
                            href="https://github.com/equinor/webviz"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="gap-selectable-x text-link flex w-max items-center rounded px-4 py-2 font-medium"
                        >
                            <Icon name="github" />
                            Webviz on GitHub
                            <Icon name="external_link" className="h-4" />
                        </a>
                        <Combobox
                            items={["User guide", "API reference"]}
                            placeholder="Documentation"
                            itemToStringLabel={(item: string) => item}
                            itemToStringValue={(item: string) => item}
                        />
                    </section>
                    <RecentSnapshots workbench={props.workbench} />
                </div>
            </div>
        </>
    );
}
