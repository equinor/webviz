import { getSessionsMetadataQueryKey } from "@api";
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
import { toast } from "react-toastify";

import {
    createSessionWithCacheUpdate,
    createSnapshotWithCacheUpdate,
    hashJsonString,
    localStorageKeyForSessionId,
    objectToJsonString,
    updateSessionWithCacheUpdate,
} from "./utils";
import { loadWorkbenchSessionFromBackend } from "./WorkbenchSessionLoader";
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

    private _lastPersistedMs: number | null = null;
    private _lastModifiedMs: number = 0;
    private _backendLastUpdatedMs: number | null = null;

    constructor(workbench: Workbench) {
        this._workbench = workbench;
    }

    async setWorkbenchSession(session: PrivateWorkbenchSession) {
        if (this._workbenchSession) {
            this.unsubscribeFromSessionUpdates();
        }

        this._workbenchSession = session;

        if (session.isSnapshot()) {
            return; // No need to persist snapshots
        }

        this._currentStateString = makeWorkbenchSessionStateString(this._workbenchSession);
        this._currentHash = await hashJsonString(this._currentStateString);
        this._lastPersistedMs = session.getMetadata().updatedAt;
        this._lastModifiedMs = session.getMetadata().lastModifiedMs;

        if (!session.getLoadedFromLocalStorage()) {
            this._lastPersistedHash = this._currentHash;
        } else {
            this._lastPersistedHash = null;
        }

        this.updatePersistenceInfo();

        this.subscribeToSessionChanges();
        this.subscribeToDashboardUpdates();
        this.subscribeToModuleInstanceUpdates();

        this._publishSubscribeDelegate.notifySubscribers(WorkbenchSessionPersistenceServiceTopic.PERSISTENCE_INFO);

        this._fetchingInterval = setInterval(() => {
            this.repeatedlyFetchSessionFromBackend();
        }, 10000); // Fetch every 10 seconds
    }

    async repeatedlyFetchSessionFromBackend() {
        if (!this._workbenchSession) {
            return;
        }

        const sessionId = this._workbenchSession.getId();
        if (!sessionId || !this._workbenchSession.getIsPersisted()) {
            return;
        }

        const sessionBackend = await loadWorkbenchSessionFromBackend(
            this._workbench.getAtomStoreMaster(),
            this._workbench.getQueryClient(),
            sessionId,
        );

        this._backendLastUpdatedMs = sessionBackend.getMetadata().updatedAt;
        this.updatePersistenceInfo();
    }

    removeWorkbenchSession() {
        if (!this._workbenchSession) {
            return;
        }

        this.removeFromLocalStorage();
        this.unsubscribeFromSessionUpdates();
        this.reset();
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
                this.pullFullSessionState();
                this.subscribeToDashboardUpdates();
            }),
        );

        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "workbench-session",
            this._workbenchSession
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(PrivateWorkbenchSessionTopic.ENSEMBLE_SET)(() => {
                this.pullFullSessionState();
                this.subscribeToModuleInstanceUpdates();
            }),
        );

        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "workbench-session",
            this._workbenchSession
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(PrivateWorkbenchSessionTopic.REALIZATION_FILTER_SET)(() => {
                this.pullFullSessionState();
            }),
        );

        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "workbench-session",
            this._workbenchSession
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(PrivateWorkbenchSessionTopic.METADATA)(() => {
                this.pullFullSessionState();
            }),
        );

        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "workbench-session",
            this._workbenchSession
                .getWorkbenchSettings()
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(WorkbenchSettingsTopic.SelectedColorPalettes)(() => {
                this.pullFullSessionState();
            }),
        );

        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "workbench-session",
            this._workbenchSession
                .getUserCreatedItems()
                .subscribe(UserCreatedItemsEvent.INTERSECTION_POLYLINES_CHANGE, () => {
                    this.pullFullSessionState();
                }),
        );
    }

    hasChanges(): boolean {
        return this._persistenceInfo.hasChanges;
    }

    beforeDestroy(): void {
        this._unsubscribeFunctionsManagerDelegate.unsubscribeAll();
    }

    reset(): void {
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

    private saveToLocalStorage() {
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

        await this.pullFullSessionState();
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

    private async pullFullSessionState() {
        if (!this._workbenchSession) {
            throw new Error("No active workbench session to pull state from.");
        }

        const oldHash = this._currentHash;
        this._currentStateString = makeWorkbenchSessionStateString(this._workbenchSession);
        this._currentHash = await hashJsonString(this._currentStateString);

        if (this._currentHash === oldHash) {
            return; // No changes detected
        }

        this._lastModifiedMs = Date.now();

        this._workbenchSession.updateMetadata(
            {
                lastModifiedMs: this._lastModifiedMs,
            },
            false,
        );

        this.saveToLocalStorage();
        this.updatePersistenceInfo();
    }

    async persistSessionState() {
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
        } catch (error) {
            console.error("Failed to persist session state:", error);
            toast.dismiss(toastId);
            toast.error("Failed to persist session state. Please try again later.");
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
                    this.pullFullSessionState();
                }),
            );
            this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
                "dashboards",
                dashboard.getPublishSubscribeDelegate().makeSubscriberFunction(DashboardTopic.ModuleInstances)(() => {
                    this.pullFullSessionState();
                    this.subscribeToModuleInstanceUpdates();
                }),
            );
            this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
                "dashboards",
                dashboard.getPublishSubscribeDelegate().makeSubscriberFunction(DashboardTopic.ActiveModuleInstanceId)(
                    () => {
                        this.pullFullSessionState();
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
                        this.pullFullSessionState();
                    }),
                );
            }
        }
    }
}
