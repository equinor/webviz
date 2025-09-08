import type React from "react";

import { Typography } from "@equinor/eds-core-react";
import { Refresh } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";

import {
    getVisitedSnapshotsOptions,
    getVisitedSnapshotsQueryKey,
    SnapshotAccessLogSortBy_api,
    SortDirection_api,
} from "@api";
import type { Workbench } from "@framework/Workbench";
import { CircularProgress } from "@lib/components/CircularProgress";
import { IconButton } from "@lib/components/IconButton";
import { timeAgo } from "@lib/utils/dates";

import { RECENT_CARDS_LIST_LENGTH } from "./constants";
import { SessionCard } from "./sessionCard";

export type RecentSnapshotsProps = {
    workbench: Workbench;
    onOpenSessionDialog: () => void;
};

export function RecentSnapshots(props: RecentSnapshotsProps): React.ReactNode {
    const recentSnapshotsQuery = useQuery({
        ...getVisitedSnapshotsOptions({
            query: {
                sort_by: SnapshotAccessLogSortBy_api.LAST_VISITED_AT,
                sort_direction: SortDirection_api.DESC,
                limit: RECENT_CARDS_LIST_LENGTH,
            },
        }),
        refetchInterval: 10000,
    });

    const snapshots = recentSnapshotsQuery.data?.items ?? [];
    const hasMoreSnapshots = !!recentSnapshotsQuery.data?.continuation_token;

    async function handleSnapshotClick(snapshotId: string, e: React.MouseEvent<HTMLAnchorElement>) {
        e.preventDefault();

        // Load the selected snapshot
        props.workbench.openSnapshot(snapshotId);

        // Reset query so that fresh snapshots are fetched when we return to the start page
        props.workbench.getQueryClient().resetQueries({ queryKey: getVisitedSnapshotsQueryKey() });
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

        if (!snapshots.length) {
            return <span className="text-gray-500">No recently visited snapshots.</span>;
        }

        return (
            <ul>
                {snapshots.map((snapshot) => (
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
            <Typography className="flex gap-1 items-center justify-between" variant="h2">
                Recent snapshots
                <IconButton disabled={recentSnapshotsQuery.isRefetching} onClick={() => recentSnapshotsQuery.refetch()}>
                    <Refresh fontSize="small" />
                </IconButton>
            </Typography>
            {makeContent()}
            {hasMoreSnapshots && (
                <button
                    className="inline-block w-fit text-sm text-blue-600 hover:underline cursor-pointer"
                    onClick={props.onOpenSessionDialog}
                >
                    See more...
                </button>
            )}
        </section>
    );
}
