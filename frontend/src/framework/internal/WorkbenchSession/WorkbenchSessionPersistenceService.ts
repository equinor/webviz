import { toast } from "react-toastify";

import { getSessionMetadataOptions, getSessionsMetadataQueryKey } from "@api";
import { DashboardTopic } from "@framework/internal/WorkbenchSession/Dashboard";
import {
    PrivateWorkbenchSessionTopic,
    type PrivateWorkbenchSession,
} from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import { ModuleInstanceTopic } from "@framework/ModuleInstance";
import { UserCreatedItemsEvent } from "@framework/UserCreatedItems";
import type { Workbench } from "@framework/Workbench";
import { WorkbenchSettingsTopic } from "@framework/WorkbenchSettings";
import { PublishSubscribeDelegate, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";
import { UnsubscribeFunctionsManagerDelegate } from "@lib/utils/UnsubscribeFunctionsManagerDelegate";

import {
    createSessionWithCacheUpdate,
    createSnapshotWithCacheUpdate,
    hashJsonString,
    localStorageKeyForSessionId,
    objectToJsonString,
    updateSessionWithCacheUpdate,
} from "./utils";
import { makeWorkbenchSessionStateString } from "./WorkbenchSessionSerializer";

export type WorkbenchSessionPersistenceInfo = {
    lastModifiedMs: number;
    hasChanges: boolean;
    lastPersistedMs: number | null;
    backendLastUpdatedMs: number | null;
};

export enum WorkbenchSessionPersistenceServiceTopic {
    PERSISTENCE_INFO = "PersistenceInfo",
}

export type WorkbenchSessionPersistenceServiceTopicPayloads = {
    [WorkbenchSessionPersistenceServiceTopic.PERSISTENCE_INFO]: WorkbenchSessionPersistenceInfo;
};

export class WorkbenchSessionPersistenceService
    implements PublishSubscribe<WorkbenchSessionPersistenceServiceTopicPayloads>
{
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<WorkbenchSessionPersistenceServiceTopicPayloads>();
    private _unsubscribeFunctionsManagerDelegate = new UnsubscribeFunctionsManagerDelegate();
    private _workbench: Workbench;
    private _workbenchSession: PrivateWorkbenchSession | null = null;
    private _lastPersistedHash: string | null = null;
    private _currentHash: string | null = null;
    private _currentStateString: string | null = null;
    private _persistenceInfo: WorkbenchSessionPersistenceInfo = {
        lastModifiedMs: 0,
        hasChanges: false,
        lastPersistedMs: null,
        backendLastUpdatedMs: null,
    };
    private _fetchingInterval: ReturnType<typeof setInterval> | null = null;
    private _pullDebounceTimeout: ReturnType<typeof setTimeout> | null = null;
    private _pullInProgress = false;
    private _pullCounter = 0;

    private _lastPersistedMs: number | null = null;
    private _lastModifiedMs: number = 0;
    private _backendLastUpdatedMs: number | null = null;

    constructor(workbench: Workbench) {
        this._workbench = workbench;
    }

    async setWorkbenchSession(session: PrivateWorkbenchSession) {
        this.unsubscribeFromSessionUpdates();

        this._workbenchSession = session;

        if (session.isSnapshot()) {
            return; // No need to persist snapshots
        }

        this._currentStateString = makeWorkbenchSessionStateString(this._workbenchSession);
        this._currentHash = await hashJsonString(this._currentStateString);
        this._lastPersistedMs = session.getMetadata().updatedAt;
        this._lastModifiedMs = session.getMetadata().lastModifiedMs;

        if (!session.getIsLoadedFromLocalStorage()) {
            this._lastPersistedHash = this._currentHash;
        } else {
            this._lastPersistedHash = null;
        }

        this.updatePersistenceInfo();

        this.subscribeToSessionChanges();
        this.subscribeToDashboardUpdates();
        this.subscribeToModuleInstanceUpdates();

        if (this._fetchingInterval) {
            clearInterval(this._fetchingInterval);
        }
        this._fetchingInterval = setInterval(() => {
            this.repeatedlyFetchSessionFromBackend();
        }, 10000); // Fetch every 10 seconds
    }

    async repeatedlyFetchSessionFromBackend() {
        const queryClient = this._workbench.getQueryClient();
        if (!this._workbenchSession) {
            return;
        }

        const sessionId = this._workbenchSession.getId();
        if (!sessionId || !this._workbenchSession.getIsPersisted()) {
            return;
        }

        try {
            const sessionBackendMetadata = await queryClient.fetchQuery({
                ...getSessionMetadataOptions({
                    path: { session_id: sessionId },
                }),
            });

            this._backendLastUpdatedMs = new Date(sessionBackendMetadata.updatedAt).getTime();
            this.updatePersistenceInfo();
        } catch (error) {
            console.error("Failed to fetch session from backend:", error);
        }
    }

    removeWorkbenchSession() {
        if (!this._workbenchSession) {
            return;
        }

        this.removeFromLocalStorage();
        this.unsubscribeFromSessionUpdates();
        this.resetInternalState();
        this._workbenchSession = null;

        if (this._fetchingInterval) {
            clearInterval(this._fetchingInterval);
        }
    }

    removeFromLocalStorage(): void {
        const key = this.makeLocalStorageKey();
        localStorage.removeItem(key);
    }

    getWorkbenchSession(): PrivateWorkbenchSession | null {
        return this._workbenchSession;
    }

    private subscribeToSessionChanges() {
        if (!this._workbenchSession) {
            throw new Error("No active workbench session to subscribe to changes.");
        }

        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "workbench-session",
            this._workbenchSession
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(PrivateWorkbenchSessionTopic.DASHBOARDS)(() => {
                this.schedulePullFullSessionState();
                this.subscribeToDashboardUpdates();
            }),
        );

        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "workbench-session",
            this._workbenchSession
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(PrivateWorkbenchSessionTopic.ENSEMBLE_SET)(() => {
                this.schedulePullFullSessionState();
                this.subscribeToModuleInstanceUpdates();
            }),
        );

        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "workbench-session",
            this._workbenchSession
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(PrivateWorkbenchSessionTopic.REALIZATION_FILTER_SET)(() => {
                this.schedulePullFullSessionState();
            }),
        );

        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "workbench-session",
            this._workbenchSession
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(PrivateWorkbenchSessionTopic.METADATA)(() => {
                this.schedulePullFullSessionState();
            }),
        );

        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "workbench-session",
            this._workbenchSession
                .getWorkbenchSettings()
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(WorkbenchSettingsTopic.SelectedColorPalettes)(() => {
                this.schedulePullFullSessionState();
            }),
        );

        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "workbench-session",
            this._workbenchSession
                .getUserCreatedItems()
                .subscribe(UserCreatedItemsEvent.INTERSECTION_POLYLINES_CHANGE, () => {
                    this.schedulePullFullSessionState();
                }),
        );
    }

    hasChanges(): boolean {
        return this._persistenceInfo.hasChanges;
    }

    beforeDestroy(): void {
        this._unsubscribeFunctionsManagerDelegate.unsubscribeAll();
    }

    resetInternalState(): void {
        this._lastPersistedHash = null;
        this._currentHash = null;
        this._currentStateString = null;
        this._persistenceInfo = {
            lastModifiedMs: 0,
            hasChanges: false,
            lastPersistedMs: null,
            backendLastUpdatedMs: null,
        };
        this._lastPersistedMs = null;
        this._lastModifiedMs = 0;

        if (this._pullDebounceTimeout) {
            clearTimeout(this._pullDebounceTimeout);
            this._pullDebounceTimeout = null;
        }
        this._pullCounter++;
        this._pullInProgress = false;

        if (this._fetchingInterval) {
            clearInterval(this._fetchingInterval);
            this._fetchingInterval = null;
        }

        this._publishSubscribeDelegate.notifySubscribers(WorkbenchSessionPersistenceServiceTopic.PERSISTENCE_INFO);
    }

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<WorkbenchSessionPersistenceServiceTopicPayloads> {
        return this._publishSubscribeDelegate;
    }

    makeSnapshotGetter<T extends WorkbenchSessionPersistenceServiceTopic.PERSISTENCE_INFO>(
        topic: T,
    ): () => WorkbenchSessionPersistenceServiceTopicPayloads[T] {
        const snapshotGetter = (): any => {
            if (topic === WorkbenchSessionPersistenceServiceTopic.PERSISTENCE_INFO) {
                return this._persistenceInfo;
            }
            throw new Error(`Unknown topic: ${topic}`);
        };

        return snapshotGetter;
    }

    private makeLocalStorageKey(): string {
        if (!this._workbenchSession) {
            throw new Error("Workbench is not set. Cannot create local storage key.");
        }

        const sessionId = this._workbenchSession.getId();
        return localStorageKeyForSessionId(sessionId);
    }

    private persistToLocalStorage() {
        const key = this.makeLocalStorageKey();

        if (this._currentStateString) {
            localStorage.setItem(key, this._currentStateString);
        }
    }

    async makeSnapshot(title: string, description: string): Promise<string | null> {
        const queryClient = this._workbench.getQueryClient();

        if (!this._workbenchSession) {
            throw new Error("No active workbench session to make a snapshot of.");
        }

        await this.pullFullSessionState({ immediate: true });
        if (!this._currentStateString) {
            throw new Error("Current state string is not set. Cannot make a snapshot.");
        }
        const toastId = toast.loading("Creating snapshot...");

        try {
            const snapshotId = await createSnapshotWithCacheUpdate(queryClient, {
                title,
                description,
                content: objectToJsonString(this._workbenchSession.getContent()),
            });
            toast.dismiss(toastId);
            toast.success("Snapshot successfully created.");
            return snapshotId;
        } catch (error) {
            console.error("Failed to create snapshot:", error);
            toast.dismiss(toastId);
            toast.error("Failed to create snapshot. Please try again later.");

            return null;
        }
    }

    private schedulePullFullSessionState(delay: number = 200) {
        if (this._pullDebounceTimeout) {
            clearTimeout(this._pullDebounceTimeout);
        }

        this._pullDebounceTimeout = setTimeout(() => {
            this._pullDebounceTimeout = null;
            this.pullFullSessionState();
        }, delay);
    }

    private async pullFullSessionState({ immediate = false } = {}): Promise<boolean> {
        if (!this._workbenchSession) {
            console.warn("No active workbench session to pull state from.");
            return false;
        }

        if (this._pullInProgress && !immediate) {
            // Do not allow concurrent pulls – let debounce handle retries
            return false;
        }

        this._pullInProgress = true;
        const localPullId = ++this._pullCounter;

        try {
            const oldHash = this._currentHash;
            const newStateString = makeWorkbenchSessionStateString(this._workbenchSession);
            const newHash = await hashJsonString(newStateString);

            // Only apply if it's still the latest pull
            if (localPullId !== this._pullCounter) {
                return false;
            }

            if (newHash !== oldHash) {
                this._currentStateString = newStateString;
                this._currentHash = newHash;
                this._lastModifiedMs = Date.now();

                this._workbenchSession.updateMetadata({ lastModifiedMs: this._lastModifiedMs }, false);
                this.persistToLocalStorage();
                this.updatePersistenceInfo();

                return true;
            }
            return false; // No changes detected
        } catch (error) {
            console.error("Failed to pull full session state:", error);
            return false;
        } finally {
            this._pullInProgress = false;
        }
    }

    async persistSessionState(): Promise<boolean> {
        const queryClient = this._workbench.getQueryClient();

        if (!this._workbenchSession) {
            throw new Error("No active workbench session to persist.");
        }

        if (!this._currentStateString) {
            throw new Error("Current state string is not set. Cannot persist session state.");
        }

        const metadata = this._workbenchSession.getMetadata();
        const id = this._workbenchSession.getId();
        const toastId = toast.loading("Persisting session state...");

        if (this._currentHash === this._lastPersistedHash) {
            toast.dismiss(toastId);
            toast.info("No changes to persist.");
            return false;
        }

        try {
            if (this._workbenchSession.getIsPersisted()) {
                if (!id) {
                    throw new Error("Session ID is not set. Cannot update session state.");
                }
                await updateSessionWithCacheUpdate(queryClient, {
                    id,
                    content: objectToJsonString(this._workbenchSession.getContent()),
                    metadata: {
                        title: metadata.title,
                        description: metadata.description,
                    },
                });
                // On successful update, we can safely remove the local storage recovery entry
                this.removeFromLocalStorage();

                toast.dismiss(toastId);
                toast.success("Session state updated successfully.");
            } else {
                const id = await createSessionWithCacheUpdate(queryClient, {
                    title: metadata.title,
                    description: metadata.description ?? null,
                    content: objectToJsonString(this._workbenchSession.getContent()),
                });
                this._workbenchSession.setId(id);
                toast.dismiss(toastId);
                toast.success("Session successfully created and persisted.");
            }

            // Reset queries to ensure the new session is fetched
            queryClient.resetQueries({ queryKey: getSessionsMetadataQueryKey() });

            this._lastPersistedMs = Date.now();
            this._lastPersistedHash = this._currentHash;
            this._workbenchSession.setIsPersisted(true);
            this.updatePersistenceInfo();
            return true;
        } catch (error) {
            console.error("Failed to persist session state:", error);
            toast.dismiss(toastId);
            toast.error("Failed to persist session state. Please try again later.");
            return false;
        }
    }

    private updatePersistenceInfo() {
        this._persistenceInfo = {
            lastModifiedMs: this._lastModifiedMs,
            hasChanges: this._currentHash !== this._lastPersistedHash,
            lastPersistedMs: this._lastPersistedMs,
            backendLastUpdatedMs: this._backendLastUpdatedMs,
        };
        this._publishSubscribeDelegate.notifySubscribers(WorkbenchSessionPersistenceServiceTopic.PERSISTENCE_INFO);
    }

    private unsubscribeFromSessionUpdates() {
        this._unsubscribeFunctionsManagerDelegate.unsubscribeAll();
    }

    private subscribeToDashboardUpdates() {
        if (!this._workbenchSession) {
            throw new Error("No active workbench session to subscribe to dashboard updates.");
        }

        this._unsubscribeFunctionsManagerDelegate.unsubscribe("dashboards");

        const dashboards = this._workbenchSession.getDashboards();

        for (const dashboard of dashboards) {
            this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
                "dashboards",
                dashboard.getPublishSubscribeDelegate().makeSubscriberFunction(DashboardTopic.Layout)(() => {
                    this.schedulePullFullSessionState();
                }),
            );
            this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
                "dashboards",
                dashboard.getPublishSubscribeDelegate().makeSubscriberFunction(DashboardTopic.ModuleInstances)(() => {
                    this.schedulePullFullSessionState();
                    this.subscribeToModuleInstanceUpdates();
                }),
            );
            this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
                "dashboards",
                dashboard.getPublishSubscribeDelegate().makeSubscriberFunction(DashboardTopic.ActiveModuleInstanceId)(
                    () => {
                        this.schedulePullFullSessionState();
                    },
                ),
            );
        }
    }

    private subscribeToModuleInstanceUpdates() {
        if (!this._workbenchSession) {
            throw new Error("No active workbench session to subscribe to module instance updates.");
        }

        this._unsubscribeFunctionsManagerDelegate.unsubscribe("module-instances");

        const dashboards = this._workbenchSession.getDashboards();
        for (const dashboard of dashboards) {
            const moduleInstances = dashboard.getModuleInstances();
            for (const moduleInstance of moduleInstances) {
                this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
                    "module-instances",
                    moduleInstance.makeSubscriberFunction(ModuleInstanceTopic.SERIALIZED_STATE)(() => {
                        this.schedulePullFullSessionState();
                    }),
                );
            }
        }
    }
}
