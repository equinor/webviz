import React from "react";

import { useQuery } from "@tanstack/react-query";
import { take } from "lodash";

import {
    getRecentSnapshotsOptions,
    getRecentSnapshotsQueryKey,
    SnapshotAccessLogSortBy_api,
    SortDirection_api,
} from "@api";
import type { Workbench } from "@framework/Workbench";
import { CircularProgress } from "@lib/components/CircularProgress";
import { timeAgo } from "@lib/utils/dates";

export type RecentSnapshotsProps = {
    workbench: Workbench;
    onOpenSessionDialog: () => void;
};

export function RecentSnapshots(props: RecentSnapshotsProps): React.ReactNode {
    const recentSnapshotsQuery = useQuery({
        ...getRecentSnapshotsOptions({
            query: {
                sort_by: SnapshotAccessLogSortBy_api.LAST_VISITED_AT,
                sort_direction: SortDirection_api.DESC,
                limit: 6,
            },
        }),
        refetchInterval: 10000,
    });

    const hasMoreSnapshots = recentSnapshotsQuery.data?.length === 6;
    const firstFiveSnapshots = React.useMemo(() => {
        if (recentSnapshotsQuery.isPending) return [];
        return take(recentSnapshotsQuery.data, 5);
    }, [recentSnapshotsQuery.data, recentSnapshotsQuery.isPending]);

    async function handleSnapshotClick(snapshotId: string, e: React.MouseEvent<HTMLAnchorElement>) {
        e.preventDefault();

        // Load the selected snapshot
        props.workbench.openSnapshot(snapshotId);

        // Reset query so that fresh snapshots are fetched when we return to the start page
        props.workbench.getQueryClient().resetQueries({ queryKey: getRecentSnapshotsQueryKey() });
    }

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
        <>
            <ul className="pl-5">
                {firstFiveSnapshots.map((snapshot) => (
                    <li key={snapshot.snapshotId} className="flex justify-between gap-4">
                        <a
                            className="text-blue-600 hover:underline"
                            href={`/snapshot/${snapshot.snapshotId}`}
                            onClick={(evt) => handleSnapshotClick(snapshot.snapshotId, evt)}
                        >
                            {snapshot.snapshotMetadata.title}
                        </a>

                        <span className="text-gray-500">
                            ~ {timeAgo(Date.now() - new Date(snapshot.lastVisitedAt ?? "").getTime())}
                        </span>
                    </li>
                ))}
            </ul>
            {hasMoreSnapshots && (
                <button
                    className="inline-block w-fit text-sm text-blue-600 hover:underline cursor-pointer"
                    onClick={props.onOpenSessionDialog}
                >
                    See more...
                </button>
            )}
        </>
    );
}
