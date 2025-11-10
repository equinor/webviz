import { isEqual } from "lodash";
import type { PrivateWorkbenchSession } from "../../WorkbenchSession/PrivateWorkbenchSession";
import { makeWorkbenchSessionStateString } from "../../WorkbenchSession/utils/deserialization";
import { hashSessionContentString } from "../../WorkbenchSession/utils/hash";

type InternalState = {
    currentHash: string | null;
    lastPersistedHash: string | null;
    currentStateString: string | null;
    lastPersistedMs: number | null;
    lastModifiedMs: number;
    backendLastUpdatedMs: number | null;
};

export type WorkbenchSessionPersistenceInfo = {
    lastModifiedMs: number;
    hasChanges: boolean;
    lastPersistedMs: number | null;
    backendLastUpdatedMs: number | null;
};

export class SessionStateTracker {
    private readonly _session: PrivateWorkbenchSession;

    private _state: InternalState = {
        currentHash: null,
        lastPersistedHash: null,
        currentStateString: null,
        lastPersistedMs: null,
        lastModifiedMs: 0,
        backendLastUpdatedMs: null,
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

    async initialize(isLoadedFromLocalStorage: boolean): Promise<void> {
        const stateString = makeWorkbenchSessionStateString(this._session);
        const hash = await hashSessionContentString(stateString);

        this._state.currentStateString = stateString;
        this._state.currentHash = hash;
        this._state.lastModifiedMs = this._session.getMetadata().lastModifiedMs;
        this._state.lastPersistedMs = this._session.getMetadata().updatedAt;

        // Only trust the persisted hash if not loaded from localStorage
        this._state.lastPersistedHash = isLoadedFromLocalStorage ? null : hash;
        this.updateSnapshot();
    }

    async refresh(): Promise<boolean> {
        const newStateString = makeWorkbenchSessionStateString(this._session);
        const newHash = await hashSessionContentString(newStateString);

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
        this.updateSnapshot();
    }

    hasChanges(): boolean {
        return this._state.currentHash !== this._state.lastPersistedHash;
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
