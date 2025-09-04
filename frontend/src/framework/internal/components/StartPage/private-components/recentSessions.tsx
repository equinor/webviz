import React from "react";

import { useQuery } from "@tanstack/react-query";

import { getSessionsMetadataOptions, SessionSortBy_api, SortDirection_api } from "@api";
import type { Workbench } from "@framework/Workbench";
import { CircularProgress } from "@lib/components/CircularProgress";
import { timeAgo } from "@lib/utils/dates";

export type RecentSessionsProps = {
    workbench: Workbench;
};

export function RecentSessions(props: RecentSessionsProps) {
    const [state, setState] = React.useState<ReturnType<typeof useQuery>["status"]>("pending");

    function handleSessionClick(e: React.MouseEvent, sessionId: string) {
        e.preventDefault();
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
                <ul className="pl-5">
                    {sessionsQuery.data.map((session) => (
                        <li key={session.id} className="flex items-center justify-between gap-4">
                            <a
                                href="#"
                                onClick={(e) => handleSessionClick(e, session.id)}
                                className="text-blue-600 hover:underline"
                            >
                                {session.title}
                            </a>
                            <span className="text-gray-500">
                                ~ {timeAgo(Date.now() - new Date(session.updatedAt).getTime())}
                            </span>
                        </li>
                    ))}
                </ul>
            );
        }

        return <div className="text-gray-500">No recent sessions found.</div>;
    }

    return <div className="flex flex-col gap-2">{makeContent()}</div>;
}
