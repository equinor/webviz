import { QueryClient } from "@tanstack/query-core";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { GuiMessageBroker } from "@framework/GuiMessageBroker";
import { AUTO_SAVE_DEBOUNCE_MS } from "@framework/internal/persistence/constants";
import { BackendSyncManager } from "@framework/internal/persistence/core/BackendSyncManager";
import { SessionStateTracker } from "@framework/internal/persistence/core/SessionStateTracker";
import { loadWorkbenchSessionFromLocalStorage } from "@framework/internal/WorkbenchSession/utils/loaders";
import { WorkbenchSessionManager } from "@framework/internal/WorkbenchSession/WorkbenchSessionManager";
import type { Workbench } from "@framework/Workbench";

// `localStorage` is absent in the node test environment, and debug flags are read from it on import - so it must
// be stubbed before the imports above are evaluated
const storage = vi.hoisted(() => {
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
    });
    return storage;
});

function makeManager(): WorkbenchSessionManager {
    const workbench = {
        getNavigationManager: () => ({ pushState: vi.fn(), replaceState: vi.fn() }),
    } as unknown as Workbench;
    const guiMessageBroker = {
        setState: vi.fn(),
        getState: vi.fn(),
        publishEvent: vi.fn(),
    } as unknown as GuiMessageBroker;

    return new WorkbenchSessionManager(workbench, new QueryClient(), guiMessageBroker);
}

async function startNewSession() {
    const manager = makeManager();
    const session = await manager.startNewSession();
    // Changes made right after a session starts aren't backed up
    await vi.advanceTimersByTimeAsync(AUTO_SAVE_DEBOUNCE_MS + 50);

    const persistence = manager.getPersistenceOrchestrator();
    if (!persistence) {
        throw new Error("A new session is expected to be persisted");
    }
    return { manager, session, persistence };
}

const SAVED_SESSION_ID = "saved-session-id";

// Holds back the backend's response to the next save, until finish() is called
function holdBackendSave() {
    let markSent: () => void = () => {};
    const sent = new Promise<void>((resolve) => {
        markSent = resolve;
    });
    let respond: (newId: string) => void = () => {};

    vi.spyOn(BackendSyncManager.prototype, "persist").mockImplementation(() => {
        markSent();
        return new Promise((resolve) => {
            respond = resolve;
        });
    });

    return { sent, finish: () => respond(SAVED_SESSION_ID) };
}

// Hashing the session's state isn't driven by timers - so state refreshes are awaited directly
function trackStateRefreshes() {
    const refresh = vi.spyOn(SessionStateTracker.prototype, "refresh");
    return {
        refresh,
        settled: () => Promise.all(refresh.mock.results.map((result) => result.value)),
    };
}

describe("WorkbenchSessionManager", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        storage.clear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    test("keeps the latest session state in the local backup when torn down with a pending backup refresh", async () => {
        const { manager, session } = await startNewSession();

        session.addDashboard();
        // E.g. a logout before the debounced backup refresh ran
        manager.beforeDestroy();

        const backup = loadWorkbenchSessionFromLocalStorage(null);
        expect(backup?.content.dashboards).toHaveLength(2);
    });

    test("keeps the latest session state in the local backup when torn down while a backup refresh is running", async () => {
        const { manager, session } = await startNewSession();
        const stateRefreshes = trackStateRefreshes();

        session.addDashboard();
        vi.advanceTimersByTime(AUTO_SAVE_DEBOUNCE_MS);
        // Refreshes are queued - started on the next microtask
        await Promise.resolve();
        expect(stateRefreshes.refresh).toHaveBeenCalledOnce();
        manager.beforeDestroy();
        await stateRefreshes.settled();

        const backup = loadWorkbenchSessionFromLocalStorage(null);
        expect(backup?.content.dashboards).toHaveLength(2);
    });

    test("backs up edits made right before a save that fails", async () => {
        const { session, persistence } = await startNewSession();
        const stateRefreshes = trackStateRefreshes();
        vi.spyOn(BackendSyncManager.prototype, "persist").mockRejectedValue(new Error("Network error"));
        vi.spyOn(console, "error").mockImplementation(() => {});

        session.addDashboard();
        // Before the debounced backup refresh ran
        const result = await persistence.persistNow();
        expect(result.success).toBe(false);
        await vi.advanceTimersByTimeAsync(AUTO_SAVE_DEBOUNCE_MS);
        await stateRefreshes.settled();

        const backup = loadWorkbenchSessionFromLocalStorage(null);
        expect(backup?.content.dashboards).toHaveLength(2);
    });

    test("removes the local backup once saved", async () => {
        const { persistence } = await startNewSession();
        const backendSave = holdBackendSave();

        const saving = persistence.persistNow();
        await backendSave.sent;
        backendSave.finish();
        await saving;

        expect(persistence.hasChanges()).toBe(false);
        expect(loadWorkbenchSessionFromLocalStorage(null)).toBeNull();
        expect(loadWorkbenchSessionFromLocalStorage(SAVED_SESSION_ID)).toBeNull();
    });

    test("keeps edits made while saving in the local backup, and as unsaved", async () => {
        const { session, persistence } = await startNewSession();
        const backendSave = holdBackendSave();

        const saving = persistence.persistNow();
        await backendSave.sent;
        session.addDashboard();
        // The debounced backup refresh picks up the edit before the save completes
        await vi.waitFor(() => expect(loadWorkbenchSessionFromLocalStorage(null)?.content.dashboards).toHaveLength(2));
        backendSave.finish();
        await saving;

        expect(persistence.hasChanges()).toBe(true);
        // Now stored under the id the save assigned, so the backup is recovered along with the saved session
        expect(loadWorkbenchSessionFromLocalStorage(null)).toBeNull();
        expect(loadWorkbenchSessionFromLocalStorage(SAVED_SESSION_ID)?.content.dashboards).toHaveLength(2);
    });

    test("keeps edits made while saving as unsaved before their backup refresh ran", async () => {
        const { session, persistence } = await startNewSession();
        const backendSave = holdBackendSave();

        const saving = persistence.persistNow();
        await backendSave.sent;
        session.addDashboard();
        backendSave.finish();
        await saving;

        expect(persistence.hasChanges()).toBe(true);
        expect(loadWorkbenchSessionFromLocalStorage(SAVED_SESSION_ID)?.content.dashboards).toHaveLength(2);
    });

    test("keeps a title changed while saving as unsaved", async () => {
        const { session, persistence } = await startNewSession();
        const backendSave = holdBackendSave();

        const saving = persistence.persistNow();
        await backendSave.sent;
        session.updateMetadata({ title: "Renamed while saving" });
        backendSave.finish();
        await saving;

        expect(persistence.hasChanges()).toBe(true);
        const backup = loadWorkbenchSessionFromLocalStorage(SAVED_SESSION_ID);
        expect(backup?.metadata.title).toBe("Renamed while saving");
    });

    test("keeps the local backup when torn down while saving", async () => {
        const { manager, session, persistence } = await startNewSession();
        const backendSave = holdBackendSave();

        const saving = persistence.persistNow();
        await backendSave.sent;
        session.addDashboard();
        // E.g. a logout before the save completed
        manager.beforeDestroy();
        backendSave.finish();
        await saving;

        // The save only had the first dashboard - the second one is only in the backup
        const backup = loadWorkbenchSessionFromLocalStorage(null);
        expect(backup?.content.dashboards).toHaveLength(2);
    });
});
