import type React from "react";

import { useQuery } from "@tanstack/react-query";

import { GuiState } from "@framework/GuiMessageBroker";
import type { Workbench } from "@framework/Workbench";
import { CircularProgress } from "@lib/components/CircularProgress";
import { timeAgo } from "@lib/utils/dates";
import { getSnapshotAccessLogsOptions, getSnapshotAccessLogsQueryKey } from "@api";

export type RecentSnapshotsProps = {
    workbench: Workbench;
};

export function RecentSnapshots(props: RecentSnapshotsProps): React.ReactNode {
    const recentSnapshotsQuery = useQuery({
        ...getSnapshotAccessLogsOptions(),
        refetchInterval: 10000,
    });

    async function handleSnapshotClick(e: React.MouseEvent<HTMLAnchorElement>) {
        e.preventDefault();

        // Load the selected snapshot
        // TODO: Make this to a workbench method
        props.workbench.getGuiMessageBroker().setState(GuiState.IsLoadingSession, true);

        history.pushState(null, "", e.currentTarget.href);
        await props.workbench.handleNavigation();

        props.workbench.getGuiMessageBroker().setState(GuiState.IsLoadingSession, false);
        // Reset query so that fresh snapshots are fetched when we return to the start page
        props.workbench.getQueryClient().resetQueries({ queryKey: getSnapshotAccessLogsQueryKey() });
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

    if (!recentSnapshotsQuery.data.items.length) {
        return <span className="text-gray-500">No recently visited snapshots.</span>;
    }

    return (
        <ul className="pl-5">
            {recentSnapshotsQuery.data.items.map((snapshot) => (
                <li key={snapshot.snapshotId} className="flex justify-between gap-4">
                    <a
                        className="text-blue-600 hover:underline"
                        href={`/snapshot/${snapshot.snapshotId}`}
                        onClick={handleSnapshotClick}
                    >
                        {snapshot.snapshotMetadata.title}
                    </a>

                    <span className="text-gray-500">
                        ~ {timeAgo(Date.now() - new Date(snapshot.lastVisitedAt ?? "").getTime())}
                    </span>
                </li>
            ))}
        </ul>
    );
}
