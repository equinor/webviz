import type { PrivateWorkbenchSession } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";

import { makeWorkbenchSessionLocalStorageString } from "../../WorkbenchSession/utils/deserialization";
import { localStorageKeyForSessionId } from "../../WorkbenchSession/utils/localStorageHelpers";

/**
 * Handles saving and restoring workbench session backups to localStorage.
 * Provides simple crash recovery and offline persistence.
 */
export class LocalBackupManager {
    private readonly _session: PrivateWorkbenchSession;

    constructor(session: PrivateWorkbenchSession) {
        this._session = session;
    }

    /**
     * Writes the current session state to localStorage.
     * This should only be called after pulling a fresh serialized state.
     */
    persist(): void {
        const sessionId = this._session.getId();
        if (this._session.isSnapshot()) return;

        try {
            const key = localStorageKeyForSessionId(sessionId);
            const serialized = makeWorkbenchSessionLocalStorageString(this._session);
            localStorage.setItem(key, serialized);
        } catch (err) {
            console.warn("Failed to persist local backup:", err);
        }
    }

    /**
     * Reads a previously stored session backup from localStorage, if it exists.
     */
    restore(): string | null {
        const sessionId = this._session.getId();
        if (!sessionId) return null;

        const key = localStorageKeyForSessionId(sessionId);
        try {
            return localStorage.getItem(key);
        } catch (err) {
            console.warn("Failed to read local backup:", err);
            return null;
        }
    }

    /**
     * Removes the localStorage entry for this session.
     * Called after a successful backend persist or when session closes.
     */
    remove(): void {
        const sessionId = this._session.getId();
        if (!sessionId) return;

        const key = localStorageKeyForSessionId(sessionId);
        try {
            localStorage.removeItem(key);
        } catch (err) {
            console.warn("Failed to remove local backup:", err);
        }
    }

    /**
     * Checks whether a backup exists for this session.
     */
    hasBackup(): boolean {
        const sessionId = this._session.getId();
        if (!sessionId) return false;

        const key = localStorageKeyForSessionId(sessionId);
        try {
            return localStorage.getItem(key) !== null;
        } catch {
            return false;
        }
    }
}
