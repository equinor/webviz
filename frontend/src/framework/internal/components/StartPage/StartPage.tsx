import { Icon, Tooltip, Typography } from "@equinor/eds-core-react";
import { category, dashboard, folder_open, github, external_link } from "@equinor/eds-icons";

import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";

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

    return (
        <div className="h-full w-full flex items-center justify-center min-h-0">
            <div className="flex gap-16">
                <div className="flex flex-col gap-12">
                    <section className="flex flex-col gap-2">
                        <Typography variant="h2">Start</Typography>
                        <Tooltip placement="right" title="Create a new free session and save it later on demand.">
                            <Button variant="text" onClick={handleNewSession}>
                                <Icon name="category" />
                                New session
                            </Button>
                        </Tooltip>
                        <Tooltip placement="right" title="Open an existing session.">
                            <Button variant="text">
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
                </div>
                <section className="flex flex-col gap-4 w-sm">
                    <Typography variant="h2">Recent</Typography>
                    <section>
                        <Typography variant="h6">Sessions</Typography>
                        <RecentSessions workbench={props.workbench} />
                    </section>
                    <section>
                        <Typography variant="h6">Snapshots</Typography>
                        <RecentSnapshots workbench={props.workbench} />
                    </section>
                </section>
            </div>
        </div>
    );
}
