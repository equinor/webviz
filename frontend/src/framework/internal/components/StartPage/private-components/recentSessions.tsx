import type React from "react";

import { getSessionsMetadataOptions, SortDirection_api, SessionSortBy_api, type SessionMetadata_api } from "@api";
import { GuiState, useGuiState } from "@framework/GuiMessageBroker";
import { buildSessionUrl } from "@framework/internal/WorkbenchSession/utils/url";
import type { Workbench } from "@framework/Workbench";
import { timeAgo } from "@lib/utils/dates";

import { ItemCard } from "./itemCard";
import { RecentList } from "./recentList";

export type RecentSessionsProps = {
    workbench: Workbench;
};

export function RecentSessions(props: RecentSessionsProps) {
    const [, setShowOverviewDialog] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.SessionSnapshotOverviewDialogOpen,
    );
    const [, setOverviewContentMode] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.SessionSnapshotOverviewDialogMode,
    );

    function handleMoreClick() {
        setOverviewContentMode("sessions");
        setShowOverviewDialog(true);
    }

    async function handleSessionClick(sessionId: string, evt: React.MouseEvent) {
        evt.preventDefault();
        await props.workbench.getSessionManager().openSession(sessionId);
    }

    return (
        <div className="min-w-64 w-96 h-56">
            <RecentList
                title="Recent sessions"
                useQueryOptions={{
                    ...getSessionsMetadataOptions({
                        query: {
                            sort_by: SessionSortBy_api.METADATA_UPDATED_AT,
                            sort_direction: SortDirection_api.DESC,
                            page_size: 5,
                        },
                    }),
                }}
                onDialogIconClick={handleMoreClick}
                transformData={(data) => data.items}
                renderItem={(item: SessionMetadata_api) => (
                    <ItemCard
                        href={buildSessionUrl(item.id)}
                        onClick={handleSessionClick}
                        key={item.id}
                        id={item.id}
                        title={item.title}
                        timestamp={item.updatedAt}
                        description={item.description}
                        tooltipInfo={{
                            Created: timeAgo(Date.now() - new Date(item.createdAt ?? "").getTime()),
                            Updated: timeAgo(Date.now() - new Date(item.updatedAt ?? "").getTime()),
                        }}
                    />
                )}
                makeItemKey={(item: SessionMetadata_api) => item.id}
            />
        </div>
    );
}
