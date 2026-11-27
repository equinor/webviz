import {
    getSessionMetadataOptions,
    getSessionMetadataQueryKey,
    getSessionQueryKey,
    getSessionsMetadataQueryKey,
} from "@api";
import type { PrivateWorkbenchSession } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import type { Workbench } from "@framework/Workbench";

import {
    createSessionWithCacheUpdate,
    updateSessionAndCache,
    createSnapshotWithCacheUpdate,
} from "../../WorkbenchSession/utils/crudHelpers";

/** What saving a session writes to the backend */
export type SessionSavePayload = {
    title: string;
    description?: string;
    content: string;
};

/**
 * Manages all backend persistence interactions (CRUD + metadata polling).
 */
export class BackendSyncManager {
    private readonly _workbench: Workbench;

    constructor(workbench: Workbench) {
        this._workbench = workbench;
    }

    /**
     * Fetches the backend's last updated timestamp for a session.
     * Returns `null` if unavailable or request fails.
     */
    async fetchUpdatedAt(sessionId: string): Promise<number | null> {
        try {
            const queryClient = this._workbench.getQueryClient();

            const metadata = await queryClient.fetchQuery({
                ...getSessionMetadataOptions({
                    path: { session_id: sessionId },
                }),
                // This is a poll for the latest state - never serve it from the cache
                staleTime: 0,
            });

            return new Date(metadata.updatedAt).getTime();
        } catch (err) {
            console.error("Failed to fetch session metadata:", err);
            return null;
        }
    }

    /**
     * Creates a new session on the backend.
     * Returns the new session ID.
     */
    async createSession(payload: SessionSavePayload): Promise<string> {
        const queryClient = this._workbench.getQueryClient();

        const newId = await createSessionWithCacheUpdate(queryClient, {
            title: payload.title,
            description: payload.description ?? null,
            content: payload.content,
        });

        // Reset relevant query caches
        queryClient.resetQueries({ queryKey: getSessionsMetadataQueryKey() });

        return newId;
    }

    /**
     * Updates an existing session on the backend.
     */
    async updateSession(session: PrivateWorkbenchSession, payload: SessionSavePayload): Promise<void> {
        const queryClient = this._workbench.getQueryClient();
        const id = session.getId();

        if (!id) {
            throw new Error("Cannot update session without an ID.");
        }

        await updateSessionAndCache(queryClient, id, {
            title: payload.title,
            description: payload.description ?? null,
            content: payload.content,
        });

        queryClient.resetQueries({ queryKey: getSessionsMetadataQueryKey() });
        queryClient.resetQueries({ queryKey: getSessionMetadataQueryKey({ path: { session_id: id } }) });
        queryClient.resetQueries({ queryKey: getSessionQueryKey({ path: { session_id: id } }) });
    }

    /**
     * Persists a session — automatically creates or updates.
     * Returns a new ID if created, or `undefined` if updated.
     */
    async persist(session: PrivateWorkbenchSession, payload: SessionSavePayload): Promise<string | undefined> {
        if (session.getIsPersisted()) {
            await this.updateSession(session, payload);
            return undefined;
        } else {
            const newId = await this.createSession(payload);
            return newId;
        }
    }

    /**
     * Creates a snapshot based on session content.
     */
    async createSnapshot(opts: { title: string; description: string; content: string }): Promise<string> {
        const queryClient = this._workbench.getQueryClient();

        const snapshotId = await createSnapshotWithCacheUpdate(queryClient, {
            title: opts.title,
            description: opts.description,
            content: opts.content,
        });

        return snapshotId;
    }
}
