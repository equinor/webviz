import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { Icon, Typography } from "@equinor/eds-core-react";
import { category, dashboard, folder_open } from "@equinor/eds-icons";
import { RecentSessions } from "./private-components/recentSessions";

Icon.add({ dashboard, category, folder_open });

export type StartPageProps = {
    workbench: Workbench;
};

export function StartPage(props: StartPageProps) {
    return (
        <div className="h-full w-full flex items-center justify-center min-h-0">
            <div className="flex gap-12">
                <div className="flex gap-12">
                    <section className="flex flex-col">
                        <Typography variant="h2">Start</Typography>
                        <Button variant="text">
                            <Icon name="category" />
                            New session
                        </Button>
                        <Button variant="text">
                            <Icon name="folder_open" />
                            Open session...
                        </Button>
                        <Button variant="text">
                            <Icon name="dashboard" />
                            Start from template...
                        </Button>
                    </section>
                </div>
                <Typography variant="h2">Recent</Typography>
                <div className="flex gap-8">
                    <section>
                        <Typography variant="h6">Sessions</Typography>
                        <RecentSessions />
                    </section>
                    <section>
                        <Typography variant="h6">Snapshots</Typography>
                        <ul>
                            <li>Snapshot 1</li>
                            <li>Snapshot 2</li>
                            <li>Snapshot 3</li>
                        </ul>
                    </section>
                </div>
            </div>
        </div>
    );
}
