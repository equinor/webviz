import type React from "react";

import {
    getSnapshotAccessLogsOptions,
    SnapshotAccessLogSortBy_api,
    SortDirection_api,
    type SnapshotAccessLog_api,
} from "@api";
import { GuiState, useGuiState } from "@framework/GuiMessageBroker";
import type { Workbench } from "@framework/Workbench";
import { timeAgo } from "@lib/utils/dates";

import { ItemCard } from "./itemCard";
import { RecentList } from "./recentList";

export type RecentSnapshotsProps = {
    workbench: Workbench;
};

export function RecentSnapshots(props: RecentSnapshotsProps): React.ReactNode {
    const [, setShowOverviewDialog] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.SessionSnapshotOverviewDialogOpen,
    );
    const [, setOverviewContentMode] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.SessionSnapshotOverviewDialogMode,
    );

    function handleMoreClick() {
        setOverviewContentMode("snapshots");
        setShowOverviewDialog(true);
    }

    async function handleSnapshotClick(id: string, e: React.MouseEvent<HTMLAnchorElement>) {
        e.preventDefault();
        await props.workbench.getSessionManager().openSnapshot(id);
    }

    return (
        <div className="min-w-64 w-96 h-56">
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
                onDialogIconClick={handleMoreClick}
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
                        isDeleted={item.snapshotDeleted}
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
