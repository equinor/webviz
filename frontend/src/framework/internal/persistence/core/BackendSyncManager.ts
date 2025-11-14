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
    async createSession(session: PrivateWorkbenchSession, content: string): Promise<string> {
        const queryClient = this._workbench.getQueryClient();
        const metadata = session.getMetadata();

        const newId = await createSessionWithCacheUpdate(queryClient, {
            title: metadata.title,
            description: metadata.description ?? null,
            content,
        });

        // Reset relevant query caches
        queryClient.resetQueries({ queryKey: getSessionsMetadataQueryKey() });

        return newId;
    }

    /**
     * Updates an existing session on the backend.
     */
    async updateSession(session: PrivateWorkbenchSession, content: string): Promise<void> {
        const queryClient = this._workbench.getQueryClient();
        const metadata = session.getMetadata();
        const id = session.getId();

        if (!id) {
            throw new Error("Cannot update session without an ID.");
        }

        await updateSessionAndCache(queryClient, id, {
            title: metadata.title,
            description: metadata.description ?? null,
            content,
        });

        queryClient.resetQueries({ queryKey: getSessionsMetadataQueryKey() });
        queryClient.resetQueries({ queryKey: getSessionMetadataQueryKey({ path: { session_id: id } }) });
        queryClient.resetQueries({ queryKey: getSessionQueryKey({ path: { session_id: id } }) });
    }

    /**
     * Persists a session — automatically creates or updates.
     * Returns a new ID if created, or `undefined` if updated.
     */
    async persist(session: PrivateWorkbenchSession, content: string): Promise<string | undefined> {
        if (session.getIsPersisted()) {
            await this.updateSession(session, content);
            return undefined;
        } else {
            const newId = await this.createSession(session, content);
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
