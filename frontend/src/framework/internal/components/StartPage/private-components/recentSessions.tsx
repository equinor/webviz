import { getSessionsMetadataOptions, SortBy_api, SortDirection_api } from "@api";
import type { Workbench } from "@framework/Workbench";
import { CircularProgress } from "@lib/components/CircularProgress";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type React from "react";

export type RecentSessionsProps = {
    workbench: Workbench;
};

export function RecentSessions(props: RecentSessionsProps) {
    const queryClient = useQueryClient();

    function handleSessionClick(e: React.MouseEvent, sessionId: string) {
        e.preventDefault();
        props.workbench.openSession(sessionId);
    }

    const sessionsQuery = useQuery({
        ...getSessionsMetadataOptions({
            query: {
                sort_by: SortBy_api.UPDATED_AT,
                sort_direction: SortDirection_api.DESC,
                limit: 5,
            },
        }),
    });

    if (sessionsQuery.isFetching || sessionsQuery.isError) {
        return (
            <div className="flex items-center justify-center">
                {sessionsQuery.isFetching && <CircularProgress size="medium" />}
                {sessionsQuery.isError && <span className="text-red-800">Could not fetch recent sessions...</span>}
            </div>
        );
    }

    if (!sessionsQuery.data || sessionsQuery.data?.length === 0) {
        return <div className="text-gray-500">No recent sessions found.</div>;
    }

    return (
        <div className="flex flex-col gap-2">
            <ul className="pl-5">
                {sessionsQuery.data.map((session) => (
                    <li key={session.id} className="flex items-center gap-4">
                        <a
                            href="#"
                            onClick={(e) => handleSessionClick(e, session.id)}
                            className="text-blue-600 hover:underline"
                        >
                            {session.title}
                        </a>
                        <span className="text-gray-500">~ {new Date(session.updatedAt).toLocaleString()}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
