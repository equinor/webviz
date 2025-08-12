import type React from "react";

import { Typography } from "@equinor/eds-core-react";
import { Refresh } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";

import { getRecentSnapshotsOptions, getRecentSnapshotsQueryKey } from "@api";
import { GuiState } from "@framework/GuiMessageBroker";
import type { Workbench } from "@framework/Workbench";
import { CircularProgress } from "@lib/components/CircularProgress";
import { IconButton } from "@lib/components/IconButton";
import { timeAgo } from "@lib/utils/dates";

import { SessionCard } from "./sessionCard";

export type RecentSnapshotsProps = {
    workbench: Workbench;
};

export function RecentSnapshots(props: RecentSnapshotsProps): React.ReactNode {
    const recentSnapshotsQuery = useQuery({
        ...getRecentSnapshotsOptions(),
        refetchInterval: 10000,
    });

    async function handleSnapshotClick(id: string, e: React.MouseEvent<HTMLAnchorElement>) {
        e.preventDefault();

        // Load the selected snapshot
        // TODO: Make this to a workbench method
        props.workbench.getGuiMessageBroker().setState(GuiState.IsLoadingSession, true);

        history.pushState(null, "", e.currentTarget.href);
        await props.workbench.handleNavigation();

        props.workbench.getGuiMessageBroker().setState(GuiState.IsLoadingSession, false);
        // Reset query so that fresh snapshots are fetched when we return to the start page
        props.workbench.getQueryClient().resetQueries({ queryKey: getRecentSnapshotsQueryKey() });
    }

    function makeContent() {
        if (recentSnapshotsQuery.isPending) {
            return (
                <span className="text-gray-500 flex items-center gap-2">
                    <CircularProgress size="extra-small" /> Loading recent snapshots...
                </span>
            );
        }

        if (recentSnapshotsQuery.isError) {
            return <span className="text-red-800">Could not fetch recent snapshots...</span>;
        }

        if (!recentSnapshotsQuery.data.length) {
            return <span className="text-gray-500">No recently visited snapshots.</span>;
        }

        return (
            <ul>
                {recentSnapshotsQuery.data.map((snapshot) => (
                    <SessionCard
                        href={`/snapshot/${snapshot.snapshotId}`}
                        key={snapshot.snapshotId}
                        id={snapshot.snapshotId}
                        title={snapshot.snapshotMetadata.title}
                        timestamp={snapshot.lastVisitedAt ?? ""}
                        description={snapshot.snapshotMetadata.description}
                        ownerId={snapshot.snapshotMetadata.ownerId}
                        onClick={handleSnapshotClick}
                        tooltipInfo={{
                            Visited: `${snapshot.visits} time${snapshot.visits === 1 ? "" : "s"}`,
                            Created: timeAgo(
                                Date.now() - new Date(snapshot.snapshotMetadata.createdAt ?? "").getTime(),
                            ),
                            "Last opened": timeAgo(Date.now() - new Date(snapshot.lastVisitedAt ?? "").getTime()),
                        }}
                    />
                ))}
            </ul>
        );
    }

    return (
        <section>
            <Typography className="flex gap-1 items-center" variant="h6">
                Snapshots
                <IconButton disabled={recentSnapshotsQuery.isRefetching} onClick={() => recentSnapshotsQuery.refetch()}>
                    <Refresh fontSize="inherit" />
                </IconButton>
            </Typography>
            {makeContent()}
        </section>
    );
}
