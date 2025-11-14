import { isEqual } from "lodash";

import type { PrivateWorkbenchSession } from "../../WorkbenchSession/PrivateWorkbenchSession";
import { makeWorkbenchSessionStateString } from "../../WorkbenchSession/utils/deserialization";
import { hashSessionContentString, objectToJsonString } from "../../WorkbenchSession/utils/hash";

type InternalState = {
    currentHash: string | null;
    lastPersistedHash: string | null;
    currentStateString: string | null;
    lastPersistedMs: number | null;
    lastModifiedMs: number;
    backendLastUpdatedMs: number | null;
    lastPersistedMetadata: {
        title: string;
        description?: string;
    } | null;
};

export type WorkbenchSessionPersistenceInfo = {
    lastModifiedMs: number;
    hasChanges: boolean;
    lastPersistedMs: number | null;
    backendLastUpdatedMs: number | null;
};

/**
 * Tracks the state of a workbench session for persistence purposes.
 */
export class SessionStateTracker {
    private readonly _session: PrivateWorkbenchSession;

    private _state: InternalState = {
        currentHash: null,
        lastPersistedHash: null,
        currentStateString: null,
        lastPersistedMs: null,
        lastModifiedMs: 0,
        backendLastUpdatedMs: null,
        lastPersistedMetadata: null,
    };

    private _snapshot: WorkbenchSessionPersistenceInfo = {
        lastModifiedMs: 0,
        hasChanges: false,
        lastPersistedMs: null,
        backendLastUpdatedMs: null,
    };

    constructor(session: PrivateWorkbenchSession) {
        this._session = session;
    }

    async initialize(): Promise<void> {
        const stateString = makeWorkbenchSessionStateString(this._session);

        this._state.currentStateString = stateString;
        this._state.lastModifiedMs = this._session.getMetadata().lastModifiedMs;
        this._state.lastPersistedMs = this._session.getMetadata().updatedAt;

        // Use the backend's hash if available, otherwise use the calculated hash
        const backendHash = this._session.getMetadata().hash;

        // If session is persisted and has a backend hash, use it as the source of truth
        // This applies even if loaded from localStorage (persisted sessions recovered from localStorage)
        if (this._session.getIsPersisted() && backendHash) {
            // Use the hash provided by the backend as the source of truth for BOTH current and persisted
            // This prevents false positives from deserialization artifacts
            this._state.currentHash = backendHash;
            this._state.lastPersistedHash = backendHash;

            // Store the current metadata as last persisted since we just loaded from backend
            this._state.lastPersistedMetadata = {
                title: this._session.getMetadata().title,
                description: this._session.getMetadata().description,
            };
        } else {
            // Hash only the content to match backend behavior
            const contentString = objectToJsonString(this._session.serializeContentState());
            const hash = await hashSessionContentString(contentString);

            this._state.currentHash = hash;

            // Only set lastPersistedHash/Metadata if the session has been persisted to backend
            // New unpersisted sessions should have null to indicate they need saving
            if (this._session.getIsPersisted()) {
                // Fallback case: persisted session but no hash provided
                this._state.lastPersistedHash = hash;
                this._state.lastPersistedMetadata = {
                    title: this._session.getMetadata().title,
                    description: this._session.getMetadata().description,
                };
            } else {
                // New unpersisted sessions don't have a trusted backend hash
                this._state.lastPersistedHash = null;
                this._state.lastPersistedMetadata = null;
            }
        }

        this.updateSnapshot();
    }

    async refresh(): Promise<boolean> {
        // Hash only the content to match backend behavior
        const newContentString = objectToJsonString(this._session.serializeContentState());
        const newHash = await hashSessionContentString(newContentString);

        // For state change detection, include metadata (title/description) as well
        const newStateString = makeWorkbenchSessionStateString(this._session);

        if (newHash !== this._state.currentHash) {
            this._state.currentStateString = newStateString;
            this._state.currentHash = newHash;
            this._state.lastModifiedMs = Date.now();
            this._session.updateMetadata({ lastModifiedMs: this._state.lastModifiedMs }, false);
            this.updateSnapshot();
            return true;
        }
        return false;
    }

    markPersisted() {
        this._state.lastPersistedHash = this._state.currentHash;
        this._state.lastPersistedMs = Date.now();
        this._state.lastPersistedMetadata = {
            title: this._session.getMetadata().title,
            description: this._session.getMetadata().description,
        };
        this.updateSnapshot();
    }

    hasChanges(): boolean {
        // Check if content hash changed
        const hashChanged = this._state.currentHash !== this._state.lastPersistedHash;

        // Check if metadata (title/description) changed
        const currentMetadata = this._session.getMetadata();
        const metadataChanged =
            this._state.lastPersistedMetadata !== null &&
            (currentMetadata.title !== this._state.lastPersistedMetadata.title ||
                currentMetadata.description !== this._state.lastPersistedMetadata.description);

        return hashChanged || metadataChanged;
    }

    getPersistenceInfo(): WorkbenchSessionPersistenceInfo {
        return this._snapshot;
    }

    reset(): void {
        this._state = {
            currentHash: null,
            lastPersistedHash: null,
            currentStateString: null,
            lastPersistedMs: null,
            lastModifiedMs: 0,
            backendLastUpdatedMs: null,
            lastPersistedMetadata: null,
        };

        this._snapshot = {
            lastModifiedMs: 0,
            hasChanges: false,
            lastPersistedMs: null,
            backendLastUpdatedMs: null,
        };
    }

    updateBackendTimestamp(timestampMs: number) {
        // Ignore if it didn’t change
        if (this._state.backendLastUpdatedMs === timestampMs) return;

        this._state.backendLastUpdatedMs = timestampMs;
        this.updateSnapshot();
    }

    private updateSnapshot() {
        const next: WorkbenchSessionPersistenceInfo = {
            lastModifiedMs: this._state.lastModifiedMs,
            lastPersistedMs: this._state.lastPersistedMs,
            hasChanges: this.hasChanges(),
            backendLastUpdatedMs: this._state.backendLastUpdatedMs,
        };

        if (!isEqual(this._snapshot, next)) {
            this._snapshot = next;
        }
    }
}
