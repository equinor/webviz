import { Icon, Typography, Input as EdsInput } from "@equinor/eds-core-react";
import { category, dashboard, folder_open, github, external_link } from "@equinor/eds-icons";

import { GuiState, useSetGuiState } from "@framework/GuiMessageBroker";
import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { Checkbox } from "@lib/components/Checkbox";
import { Input } from "@lib/components/Input";
import { Tooltip } from "@lib/components/Tooltip";

import { RecentSessions } from "./private-components/recentSessions";
import { RecentSnapshots } from "./private-components/recentSnapshots";

Icon.add({ dashboard, category, folder_open, github, external_link });

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
            <div className="p-57 h-full w-full flex items-center justify-center min-h-0">
                <div className="bg-surface px-selectable-horizontal grid grid-cols-2 gap-x-4 gap-y-8">
                    <div className="space-y-2 col-span-2">
                        <Checkbox
                            label="dark mode"
                            onChange={(e) => {
                                if (e.target.checked) {
                                    document
                                        .querySelector<HTMLHtmlElement>("html")
                                        ?.setAttribute("data-color-scheme", "dark");
                                } else {
                                    document
                                        .querySelector<HTMLHtmlElement>("html")
                                        ?.removeAttribute("data-color-scheme");
                                }
                            }}
                        />

                        {/* <Input className="w-auto! h-auto!" /> */}

                        <div className="flex items-center gap-2">
                            <span className="font-bold w-20">Contained: </span>
                            <Button variant="contained" color="primary">
                                Primary
                            </Button>
                            <Button variant="contained" color="secondary">
                                Secondary
                            </Button>
                            <Button variant="contained" color="success">
                                Success
                            </Button>
                            <Button variant="contained" color="danger">
                                Danger
                            </Button>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="font-bold w-20">Outlined: </span>
                            <Button variant="outlined" color="primary">
                                Primary
                            </Button>
                            <Button variant="outlined" color="secondary">
                                Secondary
                            </Button>
                            <Button variant="outlined" color="success">
                                Success
                            </Button>
                            <Button variant="outlined" color="danger">
                                Danger
                            </Button>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="font-bold w-20">Text: </span>
                            <Button variant="text" color="primary">
                                Primary
                            </Button>
                            <Button variant="text" color="secondary">
                                Secondary
                            </Button>
                            <Button variant="text" color="success">
                                Success
                            </Button>
                            <Button variant="text" color="danger">
                                Danger
                            </Button>
                        </div>
                    </div>

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
                            className="flex items-center gap-2 text-indigo-600 hover:bg-indigo-100 rounded px-4 py-2 font-medium w-max"
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
