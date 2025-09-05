import React from "react";

import { Icon, Tooltip, Typography } from "@equinor/eds-core-react";
import { category, dashboard, folder_open, github, external_link } from "@equinor/eds-icons";

import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";

import { SessionOverviewDialog } from "../SessionOverviewDialog";
import type { ModalContentMode } from "../SessionOverviewDialog/sessionOverviewDialog";

import { RecentSessions } from "./private-components/recentSessions";
import { RecentSnapshots } from "./private-components/recentSnapshots";

Icon.add({ dashboard, category, folder_open, github, external_link });

export type StartPageProps = {
    workbench: Workbench;
};

export function StartPage(props: StartPageProps) {
    function handleNewSession() {
        props.workbench.startNewSession();
    }

    const [showOverviewDialog, setShowOverviewDialog] = React.useState(false);
    const [overviewContentMode, setOverviewContentMode] = React.useState<ModalContentMode>("sessions");

    function closeOverviewDialog() {
        setShowOverviewDialog(false);
    }

    function openOverviewDialogOnSessions() {
        setShowOverviewDialog(true);
        setOverviewContentMode("sessions");
    }

    function openOverviewDialogOnSnapshots() {
        setShowOverviewDialog(true);
        setOverviewContentMode("snapshots");
    }

    return (
        <div className="h-full w-full flex items-center justify-center min-h-0">
            <div className="grid grid-cols-2 gap-x-16 gap-y-8">
                <section className="flex flex-col gap-2">
                    <Typography variant="h2">Start</Typography>
                    <Tooltip placement="right" title="Create a new free session and save it later on demand.">
                        <Button variant="text" onClick={handleNewSession}>
                            <Icon name="category" />
                            New session
                        </Button>
                    </Tooltip>
                    <Tooltip placement="right" title="Open an existing session.">
                        <Button variant="text" onClick={openOverviewDialogOnSessions}>
                            <Icon name="folder_open" />
                            Open session...
                        </Button>
                    </Tooltip>
                    <Tooltip
                        placement="right"
                        title="Start from a template to quickly set up a session with predefined settings and data."
                    >
                        <Button variant="text">
                            <Icon name="dashboard" />
                            Start from template...
                        </Button>
                    </Tooltip>
                </section>

                <RecentSessions workbench={props.workbench} onOpenSessionDialog={openOverviewDialogOnSessions} />

                <section className="flex flex-col gap-4">
                    <Typography variant="h2">Resources</Typography>
                    <a
                        href="https://github.com/equinor/webviz"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                    >
                        <Icon name="github" />
                        Webviz on GitHub
                        <Icon name="external_link" />
                    </a>
                </section>

                <RecentSnapshots workbench={props.workbench} onOpenSessionDialog={openOverviewDialogOnSnapshots} />
            </div>

            <SessionOverviewDialog
                workbench={props.workbench}
                open={showOverviewDialog}
                contentMode={overviewContentMode}
                onNewSession={handleNewSession}
                onClose={closeOverviewDialog}
                onChangeModalMode={setOverviewContentMode}
            />
        </div>
    );
}
