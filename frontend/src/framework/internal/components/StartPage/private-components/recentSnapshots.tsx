import type React from "react";

import {
    getSnapshotAccessLogsOptions,
    getSnapshotAccessLogsQueryKey,
    SnapshotAccessLogSortBy_api,
    SortDirection_api,
    type SnapshotAccessLog_api,
} from "@api";
import { GuiState } from "@framework/GuiMessageBroker";
import type { Workbench } from "@framework/Workbench";
import { timeAgo } from "@lib/utils/dates";

import { ItemCard } from "./itemCard";
import { RecentList } from "./recentList";

export type RecentSnapshotsProps = {
    workbench: Workbench;
};

export function RecentSnapshots(props: RecentSnapshotsProps): React.ReactNode {
    async function handleSnapshotClick(id: string, e: React.MouseEvent<HTMLAnchorElement>) {
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

    return (
        <div className="min-w-64 w-72">
            <RecentList
                title="Recent snapshots"
                useQueryOptions={{
                    ...getSnapshotAccessLogsOptions({
                        query: {
                            sort_by: SnapshotAccessLogSortBy_api.LAST_VISITED_AT,
                            sort_direction: SortDirection_api.DESC,
                            page_size: 5,
                        },
                    }),
                }}
                transformData={(data) => data.items}
                renderItem={(item: SnapshotAccessLog_api) => (
                    <ItemCard
                        href={`/snapshot/${item.snapshotId}`}
                        key={item.snapshotId}
                        id={item.snapshotId}
                        title={item.snapshotMetadata.title}
                        timestamp={item.lastVisitedAt ?? ""}
                        description={item.snapshotMetadata.description}
                        ownerId={item.snapshotMetadata.ownerId}
                        onClick={handleSnapshotClick}
                        tooltipInfo={{
                            Visited: `${item.visits} time${item.visits === 1 ? "" : "s"}`,
                            Created: timeAgo(Date.now() - new Date(item.snapshotMetadata.createdAt ?? "").getTime()),
                            "Last opened": timeAgo(Date.now() - new Date(item.lastVisitedAt ?? "").getTime()),
                        }}
                    />
                )}
                makeItemKey={(item: SnapshotAccessLog_api) => item.snapshotId}
            />
        </div>
    );
}
