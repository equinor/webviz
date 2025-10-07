import type { QueryClient } from "@tanstack/react-query";

import { PublishSubscribeDelegate, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";
import { UnsubscribeFunctionsManagerDelegate } from "@lib/utils/UnsubscribeFunctionsManagerDelegate";

import { AtomStoreMaster } from "./AtomStoreMaster";
import { GuiMessageBroker, GuiState, LeftDrawerContent, RightDrawerContent } from "./GuiMessageBroker";
import { DashboardTopic } from "./internal/Dashboard";
import { EnsembleUpdateMonitor } from "./internal/EnsembleUpdateMonitor";
import { PrivateWorkbenchServices } from "./internal/PrivateWorkbenchServices";
import {
    PrivateWorkbenchSession,
    PrivateWorkbenchSessionTopic,
} from "./internal/WorkbenchSession/PrivateWorkbenchSession";
import { loadWorkbenchSessionFromLocalStorage } from "./internal/WorkbenchSession/utils/loaders";
import { localStorageKeyForSessionId } from "./internal/WorkbenchSession/utils/localStorageHelpers";
import { makeWorkbenchSessionLocalStorageString } from "./internal/WorkbenchSession/utils/serialization";
import type { Template } from "./TemplateRegistry";
import { UserCreatedItemsEvent } from "./UserCreatedItems";
import type { WorkbenchServices } from "./WorkbenchServices";
import { WorkbenchSessionTopic } from "./WorkbenchSession";
import { WorkbenchSettingsTopic } from "./WorkbenchSettings";

export enum WorkbenchTopic {
    ACTIVE_SESSION = "activeSession",
    HAS_ACTIVE_SESSION = "hasActiveSession",
}

export type WorkbenchTopicPayloads = {
    [WorkbenchTopic.ACTIVE_SESSION]: PrivateWorkbenchSession | null;
    [WorkbenchTopic.HAS_ACTIVE_SESSION]: boolean;
};
export class Workbench implements PublishSubscribe<WorkbenchTopicPayloads> {
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<WorkbenchTopicPayloads>();

    private _workbenchSession: PrivateWorkbenchSession | null = null;
    private _workbenchServices: PrivateWorkbenchServices;
    private _guiMessageBroker: GuiMessageBroker;
    private _atomStoreMaster: AtomStoreMaster;
    private _queryClient: QueryClient;
    private _ensembleUpdateMonitor: EnsembleUpdateMonitor;
    private _isInitialized: boolean = false;
    private _unsubscribeFunctionsManagerDelegate = new UnsubscribeFunctionsManagerDelegate();
    private _pullDebounceTimeout: ReturnType<typeof setTimeout> | null = null;
    private _pullInProgress = false;
    private _pullCounter = 0;

    constructor(queryClient: QueryClient) {
        this._queryClient = queryClient;
        this._atomStoreMaster = new AtomStoreMaster();
        this._workbenchServices = new PrivateWorkbenchServices(this);
        this._guiMessageBroker = new GuiMessageBroker();
        this._ensembleUpdateMonitor = new EnsembleUpdateMonitor(queryClient, this);
    }

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<WorkbenchTopicPayloads> {
        return this._publishSubscribeDelegate;
    }

    makeSnapshotGetter<T extends WorkbenchTopic>(topic: T): () => WorkbenchTopicPayloads[T] {
        const snapshotGetter = (): any => {
            if (topic === WorkbenchTopic.ACTIVE_SESSION) {
                return this._workbenchSession;
            }
            if (topic === WorkbenchTopic.HAS_ACTIVE_SESSION) {
                return this._workbenchSession !== null;
            }
            throw new Error(`No snapshot getter implemented for topic ${topic}`);
        };
        return snapshotGetter;
    }

    getQueryClient(): QueryClient {
        return this._queryClient;
    }

    async initialize() {
        if (this._isInitialized) {
            console.info(
                "Workbench is already initialized. This might happen in strict mode due to useEffects being called multiple times.",
            );
            return;
        }

        this._isInitialized = true;

        const key = localStorageKeyForSessionId("default");
        const hasSessionInLocalStorage = window.localStorage.getItem(key) !== null;
        if (hasSessionInLocalStorage) {
            await this.openSessionFromLocalStorage("default", true);
        } else {
            await this.startNewSession();
        }

        if (!this._workbenchSession) {
            throw new Error("Failed to initialize workbench session.");
        }
    }

    discardLocalStorageSession(snapshotId: string | null, unloadSession = true): void {
        const key = localStorageKeyForSessionId(snapshotId);
        localStorage.removeItem(key);

        if (!unloadSession) {
            return;
        }

        this._workbenchSession = null;
        this._publishSubscribeDelegate.notifySubscribers(WorkbenchTopic.HAS_ACTIVE_SESSION);
    }

    async openSessionFromLocalStorage(snapshotId: string | null, forceOpen = false): Promise<void> {
        if (this._workbenchSession && !forceOpen) {
            console.warn("A workbench session is already active. Please close it before opening a new one.");
            return;
        }

        const sessionData = await loadWorkbenchSessionFromLocalStorage(snapshotId);
        if (!sessionData) {
            console.warn("No workbench session found in local storage.");
            return;
        }

        const session = await PrivateWorkbenchSession.fromDataContainer(
            this._atomStoreMaster,
            this._queryClient,
            sessionData,
        );

        await this.setWorkbenchSession(session);
        this._guiMessageBroker.setState(GuiState.IsLoadingSession, false);
    }

    private async setWorkbenchSession(session: PrivateWorkbenchSession): Promise<void> {
        try {
            if (session.getEnsembleSet().getEnsembleArray().length === 0) {
                this._guiMessageBroker.setState(GuiState.EnsembleDialogOpen, true);
            }

            this._guiMessageBroker.setState(GuiState.LeftDrawerContent, LeftDrawerContent.ModuleSettings);

            if (session.getActiveDashboard().getLayout().length === 0) {
                this._guiMessageBroker.setState(GuiState.RightDrawerContent, RightDrawerContent.ModulesList);
                if (this._guiMessageBroker.getState(GuiState.RightSettingsPanelWidthInPercent) === 0) {
                    this._guiMessageBroker.setState(GuiState.RightSettingsPanelWidthInPercent, 20);
                }
            }

            this._workbenchSession = session;
            this.subscribeToSessionChanges();
            await this._ensembleUpdateMonitor.pollImmediately();
            this._ensembleUpdateMonitor.startPolling();
            this._publishSubscribeDelegate.notifySubscribers(WorkbenchTopic.HAS_ACTIVE_SESSION);
            this._publishSubscribeDelegate.notifySubscribers(WorkbenchTopic.ACTIVE_SESSION);
        } catch (error) {
            console.error("Failed to hydrate workbench session:", error);
            throw new Error("Could not load workbench session from data container.");
        }
    }

    async startNewSession(): Promise<void> {
        if (this._workbenchSession) {
            console.warn("A workbench session is already active. Please close it before starting a new one.");
            return;
        }

        const session = PrivateWorkbenchSession.createEmpty(this._atomStoreMaster, this._queryClient);

        await this.setWorkbenchSession(session);
    }

    getAtomStoreMaster(): AtomStoreMaster {
        return this._atomStoreMaster;
    }

    getWorkbenchSession(): PrivateWorkbenchSession {
        if (!this._workbenchSession) {
            throw new Error("Workbench session has not been started. Call startNewSession() first.");
        }
        return this._workbenchSession;
    }

    getWorkbenchServices(): WorkbenchServices {
        return this._workbenchServices;
    }

    getGuiMessageBroker(): GuiMessageBroker {
        return this._guiMessageBroker;
    }

    applyTemplate(template: Template): void {
        if (!this._workbenchSession) {
            throw new Error("No active workbench session.");
        }

        const dashboard = this._workbenchSession.getActiveDashboard();
        dashboard.applyTemplate(template);
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
                .makeSubscriberFunction(WorkbenchSessionTopic.ENSEMBLE_SET)(() => {
                this.schedulePullFullSessionState();
            }),
        );

        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "workbench-session",
            this._workbenchSession
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(WorkbenchSessionTopic.REALIZATION_FILTER_SET)(() => {
                this.schedulePullFullSessionState();
            }),
        );

        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "workbench-session",
            this._workbenchSession
                .getWorkbenchSettings()
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(WorkbenchSettingsTopic.SELECTED_COLOR_PALETTE_IDS)(() => {
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

        this.subscribeToDashboardUpdates();
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

    private schedulePullFullSessionState(delay: number = 200) {
        this.maybeClearPullDebounceTimeout();

        this._pullDebounceTimeout = setTimeout(() => {
            this._pullDebounceTimeout = null;
            this.pullFullSessionState();
        }, delay);
    }

    private maybeClearPullDebounceTimeout() {
        if (this._pullDebounceTimeout) {
            clearTimeout(this._pullDebounceTimeout);
            this._pullDebounceTimeout = null;
        }
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
            // Only apply if it's still the latest pull
            if (localPullId !== this._pullCounter) {
                return false;
            }

            this.persistToLocalStorage();

            return true;
        } catch (error) {
            console.error("Failed to pull full session state:", error);
            return false;
        } finally {
            this._pullInProgress = false;
        }
    }

    private persistToLocalStorage() {
        const key = localStorageKeyForSessionId("default");

        if (this._workbenchSession) {
            localStorage.setItem(key, makeWorkbenchSessionLocalStorageString(this._workbenchSession));
        }
    }
}
