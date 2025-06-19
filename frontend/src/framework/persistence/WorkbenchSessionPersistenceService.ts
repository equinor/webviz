import { getDashboardOptions, getDashboardsMetadataOptions } from "@api";
import { DashboardTopic } from "@framework/Dashboard";
import {
    PrivateWorkbenchSessionTopic,
    type PrivateWorkbenchSession,
} from "@framework/internal/PrivateWorkbenchSession";
import { ModuleInstanceTopic } from "@framework/ModuleInstance";
import { PublishSubscribeDelegate, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";
import { UnsubscribeFunctionsManagerDelegate } from "@lib/utils/UnsubscribeFunctionsManagerDelegate";
import type { QueryClient } from "@tanstack/query-core";

import { hashJsonString, objectToJsonString } from "./utils";

export type WorkbenchSessionPersistenceInfo = {
    lastModifiedMs: number;
    hasChanges: boolean;
    lastPersistedMs: number | null;
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

        this.pullFullSessionState();
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

    private async pullFullSessionState() {
        const workbenchSessionState = this._workbenchSession.serializeState();
        this._currentStateString = objectToJsonString(workbenchSessionState);
        this._currentHash = await hashJsonString(this._currentStateString);

        this.updatePersistenceInfo();
    }

    async persistSessionState() {
        if (!this._currentStateString) {
            throw new Error("Current state string is not set. Cannot persist session state.");
        }

        this._lastPersistedMs = Date.now();
        this._lastPersistedHash = this._currentHash;

        // Here you would typically send the _currentStateString to your backend or storage.
        // For example:
        // await this._apiClient.persistSessionState(this._currentStateString);
        console.debug("Persisting session state:", this._currentStateString);

        this.updatePersistenceInfo();
        this._workbenchSession.setIsPersisted(true);
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

    async fetchPrivateDashboard(dashboardId: string) {
        return this._queryClient.fetchQuery({
            ...getDashboardOptions({
                path: {
                    dashboard_id: dashboardId,
                },
            }),
        });
    }

    async fetchPrivateDashboardsMetadata() {
        return this._queryClient.fetchQuery({
            ...getDashboardsMetadataOptions(),
        });
    }
}
