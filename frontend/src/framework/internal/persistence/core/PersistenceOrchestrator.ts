import { objectToJsonString } from "@framework/internal/WorkbenchSession/utils/hash";
import type { Workbench } from "@framework/Workbench";
import { PublishSubscribeDelegate, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";
import { UnsubscribeFunctionsManagerDelegate } from "@lib/utils/UnsubscribeFunctionsManagerDelegate";

import { WindowActivityObserver, WindowActivityObserverTopic, WindowActivityState } from "../../WindowActivityObserver";
import type { PrivateWorkbenchSession } from "../../WorkbenchSession/PrivateWorkbenchSession";
import { PrivateWorkbenchSessionTopic } from "../../WorkbenchSession/PrivateWorkbenchSession";
import { AUTO_SAVE_DEBOUNCE_MS, BACKEND_POLLING_INTERVAL_MS, MAX_CONTENT_SIZE_BYTES } from "../constants";

import { BackendSyncManager } from "./BackendSyncManager";
import { LocalBackupManager } from "./LocalBackupManager";
import { SessionStateTracker, type WorkbenchSessionPersistenceInfo } from "./SessionStateTracker";

export enum PersistenceOrchestratorTopic {
    PERSISTENCE_INFO = "PersistenceInfo",
}

export type PersistenceOrchestratorTopicPayloads = {
    [PersistenceOrchestratorTopic.PERSISTENCE_INFO]: WorkbenchSessionPersistenceInfo;
};

export enum PersistFailureReason {
    SAVE_IN_PROGRESS = "SAVE_IN_PROGRESS", // A save is already in progress
    NO_CHANGES = "NO_CHANGES", // There are no changes to persist
    CONTENT_TOO_LARGE = "CONTENT_TOO_LARGE", // The session content exceeds the maximum allowed size
    ERROR = "ERROR", // An error occurred
}

export type PersistResult =
    | {
          success: true;
          sessionId: string;
      }
    | {
          success: false;
          reason: PersistFailureReason;
          message?: string;
      };

export type CreateSnapshotResult =
    | {
          success: true;
          snapshotId: string;
      }
    | {
          success: false;
          message?: string;
      };

export class PersistenceOrchestrator implements PublishSubscribe<PersistenceOrchestratorTopicPayloads> {
    private readonly _tracker: SessionStateTracker;
    private readonly _backendSync: BackendSyncManager;
    private readonly _localBackup: LocalBackupManager;

    private readonly _publishSubscribeDelegate = new PublishSubscribeDelegate<PersistenceOrchestratorTopicPayloads>();
    private readonly _unsubscribeFunctionsManagerDelegate = new UnsubscribeFunctionsManagerDelegate();

    private readonly _session: PrivateWorkbenchSession;

    private _debounceTimeout: ReturnType<typeof setTimeout> | null = null;
    private _pollingInterval: ReturnType<typeof setInterval> | null = null;
    private _saveInProgress: boolean = false;
    private _destroyed: boolean = false;
    private _isInitializing: boolean = false;

    constructor(workbench: Workbench, session: PrivateWorkbenchSession) {
        this._session = session;

        this._tracker = new SessionStateTracker(session);
        this._backendSync = new BackendSyncManager(workbench);
        this._localBackup = new LocalBackupManager(session);
    }

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<PersistenceOrchestratorTopicPayloads> {
        return this._publishSubscribeDelegate;
    }

    makeSnapshotGetter<T extends PersistenceOrchestratorTopic>(
        topic: T,
    ): () => PersistenceOrchestratorTopicPayloads[T] {
        const snapshotGetter = (): PersistenceOrchestratorTopicPayloads[T] => {
            if (topic === PersistenceOrchestratorTopic.PERSISTENCE_INFO) {
                return this._tracker.getPersistenceInfo();
            }
            throw new Error(`Unknown topic: ${topic}`);
        };

        return snapshotGetter;
    }

    async start() {
        if (this._destroyed) return;
        if (this._pollingInterval) return; // already started
        if (this._session.isSnapshot()) return;

        // Mark as initializing to prevent premature backups
        this._isInitializing = true;

        // Subscribe to changes BEFORE initializing to catch any changes during hash calculation
        this.subscribeToSessionChanges();

        await this._tracker.initialize();
        this.notifyPersistenceInfoChanged();

        // For new unpersisted sessions, do an initial save to localStorage
        // This ensures the session can be recovered if the user refreshes immediately
        if (!this._session.getIsPersisted() && !this._session.getIsLoadedFromLocalStorage()) {
            this._localBackup.persist();
        }

        this.startBackendPolling();

        // Allow time for React components to mount and settle after session becomes active
        // This prevents initial component effects from triggering spurious backups
        // Use a delay longer than the debounce to ensure any pending refreshes are ignored
        setTimeout(() => {
            this._isInitializing = false;
        }, AUTO_SAVE_DEBOUNCE_MS + 50);
    }

    stop() {
        this._unsubscribeFunctionsManagerDelegate.unsubscribeAll();
        this.stopBackendPolling();

        if (this._debounceTimeout) {
            clearTimeout(this._debounceTimeout);
            this._debounceTimeout = null;
        }

        this._tracker.reset();
        this._localBackup.remove();
        this._destroyed = true;
    }

    async persistNow(): Promise<PersistResult> {
        if (this._destroyed) {
            throw new Error("Persistence service has been stopped.");
        }

        if (this._saveInProgress) {
            return {
                success: false,
                reason: PersistFailureReason.SAVE_IN_PROGRESS,
            };
        }

        this._saveInProgress = true;

        try {
            await this._tracker.refresh();

            if (!this._tracker.hasChanges()) {
                return {
                    success: false,
                    reason: PersistFailureReason.NO_CHANGES,
                };
            }

            const contentToSave = objectToJsonString(this._session.serializeContentState());

            const size = new Blob([contentToSave]).size;

            if (size > MAX_CONTENT_SIZE_BYTES) {
                return {
                    success: false,
                    reason: PersistFailureReason.CONTENT_TOO_LARGE,
                    message: `Session too large: ${(size / 1_048_576).toFixed(2)} MB (max ${(MAX_CONTENT_SIZE_BYTES / 1_048_576).toFixed(1)} MB).`,
                };
            }

            const newId = await this._backendSync.persist(this._session, contentToSave);

            // Remove recovery backup after successful save
            this._localBackup.remove();

            if (newId && !this._session.getIsPersisted()) {
                this._session.setId(newId);
                this._session.setIsPersisted(true);
            }

            this._tracker.markPersisted();
            this.notifyPersistenceInfoChanged();

            return {
                success: true,
                sessionId: this._session.getId()!,
            };
        } catch (err) {
            console.error("Failed to persist session:", err);
            return {
                success: false,
                reason: PersistFailureReason.ERROR,
            };
        } finally {
            if (!this._destroyed) {
                this._saveInProgress = false;
            }
        }
    }

    async createSnapshot(title: string, description: string): Promise<CreateSnapshotResult> {
        if (this._destroyed) {
            throw new Error("Persistence service has been stopped.");
        }

        try {
            await this._tracker.refresh();

            const snapshotId = await this._backendSync.createSnapshot({
                title,
                description,
                content: objectToJsonString(this._session.serializeContentState()),
            });

            return {
                success: true,
                snapshotId,
            };
        } catch (err) {
            console.error("Failed to create snapshot:", err);
            return {
                success: false,
                message: err instanceof Error ? err.message : "Unknown error occurred",
            };
        }
    }

    hasChanges(): boolean {
        return this._tracker.hasChanges();
    }

    private subscribeToSessionChanges() {
        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "session-change",
            this._session
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(PrivateWorkbenchSessionTopic.SERIALIZED_STATE)(() => {
                this.scheduleRefresh();
            }),
        );
    }

    private notifyPersistenceInfoChanged() {
        this._publishSubscribeDelegate.notifySubscribers(PersistenceOrchestratorTopic.PERSISTENCE_INFO);
    }

    private scheduleRefresh(delay = AUTO_SAVE_DEBOUNCE_MS) {
        // Don't schedule refreshes during initialization
        if (this._isInitializing) return;

        if (this._debounceTimeout) clearTimeout(this._debounceTimeout);

        this._debounceTimeout = setTimeout(async () => {
            if (this._destroyed) return;

            this._debounceTimeout = null;
            const changed = await this._tracker.refresh();

            if (changed) {
                this._localBackup.persist();
                this.notifyPersistenceInfoChanged();
            }
        }, delay);
    }

    private startBackendPolling() {
        this.stopBackendPolling();

        const windowActivityObserver = WindowActivityObserver.getInstance();

        // Poll on interval, but only when window is visible
        this._pollingInterval = setInterval(async () => {
            if (this._destroyed || this._session.isSnapshot()) return;

            // Skip polling if window is hidden to save resources
            if (!windowActivityObserver.isVisible()) return;

            const sessionId = this._session.getId();
            if (!sessionId) return; // no ID, skip polling

            try {
                const updatedAt = await this._backendSync.fetchUpdatedAt(sessionId);
                if (updatedAt !== null) {
                    this._tracker.updateBackendTimestamp(updatedAt);
                    this.notifyPersistenceInfoChanged();
                }
            } catch (err) {
                console.error("Polling failed:", err);
            }
        }, BACKEND_POLLING_INTERVAL_MS);

        // Subscribe to window activity changes - fetch immediately when window becomes active
        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "window-activity",
            windowActivityObserver
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(WindowActivityObserverTopic.ACTIVITY_STATE)(() => {
                const state = windowActivityObserver.getCurrentState();
                // When window becomes active after being hidden, fetch immediately
                if (state === WindowActivityState.ACTIVE && !this._session.isSnapshot()) {
                    const sessionId = this._session.getId();
                    if (sessionId) {
                        this._backendSync
                            .fetchUpdatedAt(sessionId)
                            .then((updatedAt) => {
                                if (updatedAt !== null) {
                                    this._tracker.updateBackendTimestamp(updatedAt);
                                    this.notifyPersistenceInfoChanged();
                                }
                            })
                            .catch((err) => {
                                console.error("Failed to fetch on window activation:", err);
                            });
                    }
                }
            }),
        );
    }

    private stopBackendPolling() {
        if (this._pollingInterval) {
            clearInterval(this._pollingInterval);
            this._pollingInterval = null;
        }
    }
}
