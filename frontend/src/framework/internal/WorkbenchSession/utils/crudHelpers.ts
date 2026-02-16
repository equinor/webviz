import type { InfiniteData, QueryClient } from "@tanstack/query-core";

import {
    createSession,
    createSnapshot,
    getSessionMetadataQueryKey,
    getSessionQueryKey,
    getSessionsMetadataInfiniteQueryKey,
    getSessionsMetadataQueryKey,
    getSnapshotAccessLogsInfiniteQueryKey,
    getSnapshotAccessLogsQueryKey,
    getSnapshotsMetadataInfiniteQueryKey,
    getSnapshotsMetadataQueryKey,
    updateSession,
    type NewSession_api,
    type PageSessionMetadata_api,
    type Session_api,
    type SessionUpdate_api,
} from "@api";
import { FilterLevel, makeTanstackQueryFilters } from "@framework/utils/reactQuery";

export async function createSessionWithCacheUpdate(
    queryClient: QueryClient,
    sessionData: NewSession_api,
): Promise<string> {
    const response = await createSession<true>({
        throwOnError: true,
        body: sessionData,
    });

    // Refetch to immediately update the sessions list
    queryClient.refetchQueries(makeTanstackQueryFilters([getSessionsMetadataQueryKey()]));
    queryClient.refetchQueries(makeTanstackQueryFilters([getSessionsMetadataInfiniteQueryKey()]));

    return response.data;
}

export async function updateSessionAndCache(
    queryClient: QueryClient,
    sessionId: string,
    sessionUpdate: SessionUpdate_api,
): Promise<void> {
    await updateSession<true>({
        throwOnError: true,
        path: {
            session_id: sessionId,
        },
        body: sessionUpdate,
    });

    // Refetch to immediately update the session and sessions list
    queryClient.refetchQueries(makeTanstackQueryFilters([getSessionsMetadataQueryKey()]));
    queryClient.refetchQueries(makeTanstackQueryFilters([getSessionsMetadataInfiniteQueryKey()]));
}

export async function createSnapshotWithCacheUpdate(
    queryClient: QueryClient,
    snapshotData: NewSession_api,
): Promise<string> {
    const response = await createSnapshot<true>({
        throwOnError: true,
        body: snapshotData,
    });

    // Refetch (not just invalidate) to immediately fetch the new snapshot
    // This ensures the UI updates instantly with the newly created snapshot
    queryClient.refetchQueries(makeTanstackQueryFilters([getSnapshotsMetadataQueryKey()]));
    queryClient.refetchQueries(makeTanstackQueryFilters([getSnapshotsMetadataInfiniteQueryKey()]));
    queryClient.refetchQueries(makeTanstackQueryFilters([getSnapshotAccessLogsQueryKey()]));
    queryClient.refetchQueries(makeTanstackQueryFilters([getSnapshotAccessLogsInfiniteQueryKey()]));

    return response.data;
}

export function removeSessionQueryData(queryClient: QueryClient, deletedSessionId: string) {
    const sessionsListFilter = makeTanstackQueryFilters([getSessionsMetadataQueryKey()]);
    const sessionsInfiniteListFilter = { queryKey: ["getSessionsMetadata", "infinite"] };

    queryClient.setQueriesData(sessionsListFilter, function dropSessionFromList(page: PageSessionMetadata_api) {
        if (!page) return undefined;

        const { pageToken, items } = page;
        let dropped = false;

        const newItems = items.filter((session) => {
            if (session.id !== deletedSessionId) return true;

            dropped = true;
            return false;
        });

        if (dropped) return { pageToken, items: newItems };
        return undefined;
    });

    queryClient.setQueriesData(
        sessionsInfiniteListFilter,
        function dropSessionFromList(oldData: InfiniteData<PageSessionMetadata_api>) {
            if (!oldData) return undefined;

            const pageParams = oldData.pageParams;
            const existingPages = oldData.pages;

            let dropped = false;

            const newPages = existingPages.map((page) => {
                const { pageToken, items } = page;

                const newItems = items.filter((session) => {
                    if (session.id !== deletedSessionId) return true;

                    dropped = true;
                    return false;
                });

                return { pageToken, items: newItems };
            });

            if (dropped) return { pageParams, pages: newPages };
            return undefined;
        },
    );
}

export function removeSnapshotQueryData(queryClient: QueryClient) {
    // Refetch (not just invalidate) all snapshot-related queries to force immediate refetch and re-render
    // This ensures the UI updates instantly when a snapshot is deleted
    // Using refetchQueries instead of invalidateQueries ensures that active queries are refetched immediately
    queryClient.refetchQueries(makeTanstackQueryFilters([getSnapshotsMetadataQueryKey()]));
    queryClient.refetchQueries(makeTanstackQueryFilters([getSnapshotsMetadataInfiniteQueryKey()]));
    queryClient.refetchQueries(makeTanstackQueryFilters([getSnapshotAccessLogsQueryKey()]));
    queryClient.refetchQueries(makeTanstackQueryFilters([getSnapshotAccessLogsInfiniteQueryKey()]));
}

export function replaceSessionQueryData(queryClient: QueryClient, newSession: Session_api) {
    const sessionMetadataQueryKey = getSessionMetadataQueryKey({ path: { session_id: newSession.metadata.id } });
    const sessionQueryKey = getSessionQueryKey({ path: { session_id: newSession.metadata.id } });

    const sessionsMetadataQueryKey = getSessionsMetadataQueryKey();
    // ! Something breaks when using hey-api's generated infinite query options: setQueriesData is unable to get the
    // ! correct cache entry, and instead makes a new entry. getQueriesData still works as expected...
    const sessionsMetadataInfiniteQueryKey = ["getSessionsMetadata", "infinite"];

    // Replace query data that directly refers to this session
    queryClient.setQueriesData(makeTanstackQueryFilters([sessionQueryKey], FilterLevel.PATH), newSession);
    queryClient.setQueriesData(
        makeTanstackQueryFilters([sessionMetadataQueryKey], FilterLevel.PATH),
        newSession.metadata,
    );

    // Replace list data entries
    // ! We sort these queries server-side; updating entries in these lists *might* result in an an incorrectly
    // ! sorted state. We could theoretically make a filter that matches only unsorted lists, but the easier option
    // ! is to just refetch all of them...

    queryClient.invalidateQueries(makeTanstackQueryFilters([sessionMetadataQueryKey, sessionsMetadataQueryKey]));
    queryClient.invalidateQueries({ queryKey: sessionsMetadataInfiniteQueryKey });
}
