import { Icon } from "@equinor/eds-core-react";
import { category, dashboard, folder_open } from "@equinor/eds-icons";

import { GuiState, useSetGuiState } from "@framework/GuiMessageBroker";
import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { Separator } from "@lib/components/Separator";
import { Tooltip } from "@lib/components/Tooltip";
import { Heading } from "@lib/components/Typography/compositions";

import { ChangelogDialog } from "./private-components/changelogModal";
import { FeedbackDialog } from "./private-components/feedbackModal";
import { RecentSessions } from "./private-components/recentSessions";
import { RecentSnapshots } from "./private-components/recentSnapshots";

Icon.add({ dashboard, category, folder_open });

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
            <div className="h-full min-h-0 w-full overflow-auto">
                <div className="py-3xl px-md flex min-h-full w-full items-center justify-center">
                    <div className="px-selectable-horizontal gap-x-3xl gap-y-3xl grid grid-cols-1 md:grid-cols-2">
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

                        {/*
                         * DOM order is the small-screen stacking order: Start, Recent sessions, Recent
                         * snapshots, Resources, with separators between each. At `md` and up the separators
                         * are hidden and `md:order-*` restores the 2x2 grid (Resources bottom-left).
                         */}
                        <Separator layoutClassName="md:hidden" />

                        <RecentSessions workbench={props.workbench} />

                        <Separator layoutClassName="md:hidden" />

                        <RecentSnapshots workbench={props.workbench} className="md:order-2" />

                        <Separator layoutClassName="md:hidden" />

                        <section className="gap-y-sm flex flex-col md:order-1">
                            <Heading as="h3">Resources</Heading>

                            <ChangelogDialog />

                            <FeedbackDialog workbench={props.workbench} />
                        </section>
                    </div>
                </div>
            </div>
        </>
    );
}
