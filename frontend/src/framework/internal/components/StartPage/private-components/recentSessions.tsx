import React from "react";

import { Typography } from "@equinor/eds-core-react";
import { Refresh } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";

import { getSessionsMetadataOptions, SortDirection_api, SessionSortBy_api } from "@api";
import { buildSessionUrl } from "@framework/internal/WorkbenchSession/SessionUrlService";
import type { Workbench } from "@framework/Workbench";
import { CircularProgress } from "@lib/components/CircularProgress";
import { IconButton } from "@lib/components/IconButton";
import { timeAgo } from "@lib/utils/dates";

import { SessionCard } from "./sessionCard";

export type RecentSessionsProps = {
    workbench: Workbench;
};

export function RecentSessions(props: RecentSessionsProps) {
    const [state, setState] = React.useState<ReturnType<typeof useQuery>["status"]>("pending");

    function handleSessionClick(sessionId: string, evt: React.MouseEvent) {
        evt.preventDefault();
        props.workbench.openSession(sessionId);
    }

    const sessionsQuery = useQuery({
        ...getSessionsMetadataOptions({
            query: {
                sort_by: SessionSortBy_api.UPDATED_AT,
                sort_direction: SortDirection_api.DESC,
                limit: 5,
            },
        }),
        refetchInterval: 10000,
    });

    if (!sessionsQuery.isFetching) {
        if (sessionsQuery.isError) {
            if (state !== "error") {
                setState("error");
            }
        } else if (sessionsQuery.isSuccess) {
            if (state !== "success") {
                setState("success");
            }
        }
    }

    function makeContent() {
        if (state === "pending") {
            return (
                <span className="text-gray-500 flex gap-2">
                    <CircularProgress size="extra-small" /> Loading recent sessions...
                </span>
            );
        }

        if (state === "error") {
            return <span className="text-red-800">Could not fetch recent sessions...</span>;
        }

        if (state === "success" && sessionsQuery.data && sessionsQuery.data.length > 0) {
            return (
                <ul>
                    {sessionsQuery.data.map((session) => (
                        <SessionCard
                            href={buildSessionUrl(session.id)}
                            key={session.id}
                            id={session.id}
                            title={session.title}
                            timestamp={session.updatedAt}
                            description={session.description}
                            onClick={handleSessionClick}
                            tooltipInfo={{
                                Created: timeAgo(Date.now() - new Date(session.createdAt ?? "").getTime()),
                                Updated: timeAgo(Date.now() - new Date(session.updatedAt ?? "").getTime()),
                            }}
                        />
                    ))}
                </ul>
            );
        }

        return <div className="text-gray-500">No recent sessions found.</div>;
    }

    return (
        <section>
            <Typography className="flex gap-1 items-center" variant="h6">
                Sessions
                <IconButton disabled={sessionsQuery.isRefetching} onClick={() => sessionsQuery.refetch()}>
                    <Refresh fontSize="inherit" />
                </IconButton>
            </Typography>
            <div className="flex flex-col gap-2">{makeContent()}</div>
        </section>
    );
}
