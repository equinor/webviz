import type { QueryClient } from "@tanstack/query-core";

import {
    createSession,
    createSnapshot,
    getSessionQueryKey,
    getSessionsMetadataQueryKey,
    getSnapshotsMetadataQueryKey,
    updateSession,
    type NewSession_api,
    type SessionUpdate_api,
} from "@api";

export async function createSessionWithCacheUpdate(
    queryClient: QueryClient,
    sessionData: NewSession_api,
): Promise<string> {
    const response = await createSession<true>({
        throwOnError: true,
        body: sessionData,
    });

    // Invalidate the cache for the session to ensure the new session is fetched
    queryClient.invalidateQueries({
        queryKey: getSessionsMetadataQueryKey(),
    });

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

    // Invalidate the cache for the session to ensure the updated session is fetched
    queryClient.invalidateQueries({
        queryKey: getSessionQueryKey({ path: { session_id: sessionId } }),
    });
    queryClient.invalidateQueries({
        queryKey: getSessionsMetadataQueryKey(),
    });
}

export async function createSnapshotWithCacheUpdate(
    queryClient: QueryClient,
    snapshotData: NewSession_api,
): Promise<string> {
    const response = await createSnapshot<true>({
        throwOnError: true,
        body: snapshotData,
    });

    // Invalidate the cache for the session to ensure the new session is fetched
    queryClient.invalidateQueries({
        queryKey: getSnapshotsMetadataQueryKey(),
    });

    return response.data;
}
