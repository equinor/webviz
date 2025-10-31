import { toast } from "react-toastify";

import { getSessionMetadataOptions, getSessionsMetadataQueryKey } from "@api";
import {
    PrivateWorkbenchSessionTopic,
    type PrivateWorkbenchSession,
} from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import type { Workbench } from "@framework/Workbench";
import { PublishSubscribeDelegate, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";
import { UnsubscribeFunctionsManagerDelegate } from "@lib/utils/UnsubscribeFunctionsManagerDelegate";

import {
    createSessionWithCacheUpdate,
    createSnapshotWithCacheUpdate,
    updateSessionAndCache,
} from "./WorkbenchSession/utils/crudHelpers";
import { hashSessionContentString, objectToJsonString } from "./WorkbenchSession/utils/hash";
import { localStorageKeyForSessionId } from "./WorkbenchSession/utils/localStorageHelpers";
import {
    makeWorkbenchSessionLocalStorageString,
    makeWorkbenchSessionStateString,
} from "./WorkbenchSession/utils/deserialization";

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
        this._currentHash = await hashSessionContentString(this._currentStateString);
        this._lastPersistedMs = session.getMetadata().updatedAt;
        this._lastModifiedMs = session.getMetadata().lastModifiedMs;

        if (!session.getIsLoadedFromLocalStorage()) {
            this._lastPersistedHash = this._currentHash;
        } else {
            this._lastPersistedHash = null;
        }

        this.updatePersistenceInfo();

        this.subscribeToSessionChanges();

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
                .makeSubscriberFunction(PrivateWorkbenchSessionTopic.SERIALIZED_STATE)(() => {
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

        this.maybeClearPullDebounceTimeout();

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

        if (this._workbenchSession) {
            localStorage.setItem(key, makeWorkbenchSessionLocalStorageString(this._workbenchSession));
        }
    }

    async makeSnapshot(title: string, description: string): Promise<string | null> {
        const queryClient = this._workbench.getQueryClient();

        if (!this._workbenchSession) {
            throw new Error("No active workbench session to make a snapshot of.");
        }

        await this.pullFullSessionState({ immediate: true });
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

    private maybeClearPullDebounceTimeout() {
        if (this._pullDebounceTimeout) {
            clearTimeout(this._pullDebounceTimeout);
            this._pullDebounceTimeout = null;
        }
    }

    private schedulePullFullSessionState(delay: number = 200) {
        this.maybeClearPullDebounceTimeout();

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
            const newHash = await hashSessionContentString(newStateString);

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

    async persistSessionState() {
        const queryClient = this._workbench.getQueryClient();

        if (!this._workbenchSession) {
            throw new Error("No active workbench session to persist.");
        }

        if (!this._currentStateString) {
            throw new Error("Current state string is not set. Cannot persist session state.");
        }

        // Make sure we pull the latest session before we save
        this.maybeClearPullDebounceTimeout();
        await this.pullFullSessionState();

        const metadata = this._workbenchSession.getMetadata();
        const id = this._workbenchSession.getId();
        const toastId = toast.loading("Persisting session state...");

        if (this._currentHash === this._lastPersistedHash) {
            toast.dismiss(toastId);
            toast.info("No changes to persist.");
            return;
        }

        try {
            if (this._workbenchSession.getIsPersisted()) {
                if (!id) {
                    throw new Error("Session ID is not set. Cannot update session state.");
                }
                await updateSessionAndCache(queryClient, id, {
                    title: metadata.title,
                    description: metadata.description ?? null,
                    content: objectToJsonString(this._workbenchSession.getContent()),
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

                // ! Make sure you remove the localStorage backup BEFORE you store the new session id
                this.removeFromLocalStorage();

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
}
