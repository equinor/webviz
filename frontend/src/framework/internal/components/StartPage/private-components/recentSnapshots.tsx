import type React from "react";

import { useQuery } from "@tanstack/react-query";

import { getRecentSnapshotsOptions, getRecentSnapshotsQueryKey } from "@api";
import { GuiState } from "@framework/GuiMessageBroker";
import type { Workbench } from "@framework/Workbench";
import { CircularProgress } from "@lib/components/CircularProgress";

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
                />
            ))}
        </ul>
    );
}
