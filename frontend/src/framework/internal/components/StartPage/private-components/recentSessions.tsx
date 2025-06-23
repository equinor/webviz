import { getSessionsMetadataOptions, SortBy_api, SortDirection_api } from "@api";
import { CircularProgress } from "@lib/components/CircularProgress";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export function RecentSessions() {
    const queryClient = useQueryClient();

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
            <h3 className="text-lg font-semibold">Recent Sessions</h3>
            <ul className="list-disc pl-5">
                {sessionsQuery.data.map((session) => (
                    <li key={session.id} className="text-gray-800">
                        {session.title} - Last updated: {new Date(session.updatedAt).toLocaleString()}
                    </li>
                ))}
            </ul>
        </div>
    );
}
