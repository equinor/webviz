import {
    createSession,
    getSessionQueryKey,
    getSessionsMetadataQueryKey,
    updateSession,
    type NewSession_api,
    type SessionUpdate_api,
} from "@api";
import type { QueryClient } from "@tanstack/query-core";

export function objectToJsonString(obj: unknown): string {
    try {
        return JSON.stringify(obj, null, 2);
    } catch (error) {
        console.error("Failed to convert object to JSON string:", error);
        return "";
    }
}

export async function hashJsonString(jsonString: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(jsonString);

    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return hashHex;
}

export async function createSessionWithCacheUpdate(
    queryClient: QueryClient,
    sessionData: NewSession_api,
): Promise<string> {
    const response = await createSession<true>({
        body: sessionData,
    });

    // Invalidate the cache for the session to ensure the new session is fetched
    queryClient.invalidateQueries({
        queryKey: getSessionsMetadataQueryKey(),
    });

    return response.data;
}

export async function updateSessionWithCacheUpdate(
    queryClient: QueryClient,
    sessionData: SessionUpdate_api,
): Promise<void> {
    await updateSession<true>({
        path: {
            session_id: sessionData.id,
        },
        body: sessionData,
    });

    // Invalidate the cache for the session to ensure the updated session is fetched
    queryClient.invalidateQueries({
        queryKey: getSessionQueryKey({ path: { session_id: sessionData.id } }),
    });
    queryClient.invalidateQueries({
        queryKey: getSessionsMetadataQueryKey(),
    });
}
