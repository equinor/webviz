import { Icon, Typography } from "@equinor/eds-core-react";
import { category, dashboard, folder_open, github, external_link } from "@equinor/eds-icons";
import { GuiState, useGuiState } from "@framework/GuiMessageBroker";
import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { Tooltip } from "@lib/components/Tooltip";

import { RecentSessions } from "./private-components/recentSessions";
import { RecentSnapshots } from "./private-components/recentSnapshots";

Icon.add({ dashboard, category, folder_open, github, external_link });

export type StartPageProps = {
    workbench: Workbench;
};

export function StartPage(props: StartPageProps) {
    const [, setShowOverviewDialog] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.SessionSnapshotOverviewDialogOpen,
    );
    const [, setOverviewContentMode] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.SessionSnapshotOverviewDialogMode,
    );

    const [, setIsOpenTemplatesDialog] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.TemplatesDialogOpen,
    );

    function handleNewSession() {
        props.workbench.startNewSession();
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
            <div className="h-full w-full flex items-center justify-center min-h-0">
                <div className="grid grid-cols-2 gap-x-12 gap-y-8">
                    <section className="flex flex-col gap-2">
                        <Typography variant="h3">Start</Typography>
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
                    <section className="flex flex-col gap-4">
                        <Typography variant="h3">Resources</Typography>
                        <a
                            href="https://github.com/equinor/webviz"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-indigo-600 hover:bg-indigo-100 rounded px-4 py-2 font-medium"
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
