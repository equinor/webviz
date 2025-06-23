import { DashboardTopic } from "@framework/Dashboard";
import {
    PrivateWorkbenchSessionTopic,
    type PrivateWorkbenchSession,
    type SerializedWorkbenchSession,
} from "@framework/internal/PrivateWorkbenchSession";
import { ModuleInstanceTopic } from "@framework/ModuleInstance";
import { PublishSubscribeDelegate, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";
import { UnsubscribeFunctionsManagerDelegate } from "@lib/utils/UnsubscribeFunctionsManagerDelegate";
import type { QueryClient } from "@tanstack/query-core";

import {
    createSessionWithCacheUpdate,
    hashJsonString,
    objectToJsonString,
    updateSessionWithCacheUpdate,
} from "./utils";
import { toast } from "react-toastify";
import { getSessionOptions } from "@api";

export type WorkbenchSessionPersistenceInfo = {
    lastModifiedMs: number;
    hasChanges: boolean;
    lastPersistedMs: number | null;
};

export enum WorkbenchSessionPersistenceServiceTopic {
    PERSISTENCE_INFO = "PersistenceInfo",
}

export type SerializedWorkbenchSessionWithMetadata = Omit<SerializedWorkbenchSession, "metadata"> & {
    metadata: {
        title: string;
        description?: string;
    };
};

export type WorkbenchSessionPersistenceServiceTopicPayloads = {
    [WorkbenchSessionPersistenceServiceTopic.PERSISTENCE_INFO]: WorkbenchSessionPersistenceInfo;
};

export class WorkbenchSessionPersistenceService
    implements PublishSubscribe<WorkbenchSessionPersistenceServiceTopicPayloads>
{
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<WorkbenchSessionPersistenceServiceTopicPayloads>();
    private _unsubscribeFunctionsManagerDelegate = new UnsubscribeFunctionsManagerDelegate();
    private _queryClient: QueryClient;
    private _workbenchSession: PrivateWorkbenchSession;
    private _lastPersistedHash: string | null = null;
    private _currentHash: string | null = null;
    private _currentStateString: string | null = null;
    private _persistenceInfo: WorkbenchSessionPersistenceInfo = {
        lastModifiedMs: 0,
        hasChanges: false,
        lastPersistedMs: null,
    };

    private _lastPersistedMs: number | null = null;
    private _lastModifiedMs: number = 0;

    constructor(workbenchSession: PrivateWorkbenchSession, queryClient: QueryClient) {
        this._queryClient = queryClient;
        this._workbenchSession = workbenchSession;

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

    private getLocalStorageKey(): string {
        return "workbench-session";
    }

    private saveToLocalStorage() {
        const key = this.getLocalStorageKey();

        if (this._currentStateString) {
            localStorage.setItem(key, this._currentStateString);
        }
    }

    async loadFromBackend(sessionId: string): Promise<void> {
        const toastId = toast.loading("Loading session state from backend...");
        try {
            const sessionData = await this._queryClient.fetchQuery({
                ...getSessionOptions({
                    path: {
                        session_id: sessionId,
                    },
                }),
            });

            this._currentStateString = sessionData.content;
            this._currentHash = await hashJsonString(this._currentStateString);

            const content = JSON.parse(this._currentStateString);

            const data: SerializedWorkbenchSession = content;
            this._workbenchSession.deserializeState(data);

            this._workbenchSession.setId(sessionId);
            this._workbenchSession.setIsPersisted(true);
            this._workbenchSession.setMetadata({
                title: sessionData.metadata.title,
                description: sessionData.metadata.description ?? undefined,
            });

            this.updatePersistenceInfo();
            toast.dismiss(toastId);
        } catch (error) {
            console.error("Failed to load session state from backend:", error);
            toast.dismiss(toastId);
            toast.error("Failed to load session state. Please try again later.");
        }
    }

    private async pullFullSessionState() {
        const workbenchSessionState = this._workbenchSession.serializeState();
        this._currentStateString = objectToJsonString(workbenchSessionState);
        this._currentHash = await hashJsonString(this._currentStateString);

        this.saveToLocalStorage();
        this.updatePersistenceInfo();
    }

    async persistSessionState() {
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
                await updateSessionWithCacheUpdate(this._queryClient, {
                    id,
                    content: this._currentStateString,
                    metadata: {
                        title: metadata.title,
                        description: metadata.description,
                    },
                });
                toast.dismiss(toastId);
                toast.success("Session state updated successfully.");
            } else {
                const id = await createSessionWithCacheUpdate(this._queryClient, {
                    title: metadata.title,
                    description: metadata.description ?? null,
                    content: this._currentStateString,
                });
                this._workbenchSession.setId(id);
                toast.dismiss(toastId);
                toast.success("Session successfully created and persisted.");
            }

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
        this._lastModifiedMs = Date.now();

        this._persistenceInfo = {
            lastModifiedMs: this._lastModifiedMs,
            hasChanges: this._currentHash !== this._lastPersistedHash,
            lastPersistedMs: this._lastPersistedMs,
        };
        this._publishSubscribeDelegate.notifySubscribers(WorkbenchSessionPersistenceServiceTopic.PERSISTENCE_INFO);
    }

    private subscribeToDashboardUpdates() {
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
