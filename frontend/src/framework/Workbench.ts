import type { QueryClient } from "@tanstack/react-query";

import { PublishSubscribeDelegate, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";

import { AtomStoreMaster } from "./AtomStoreMaster";
import { GuiMessageBroker, GuiState, LeftDrawerContent, RightDrawerContent } from "./GuiMessageBroker";
import { PrivateWorkbenchServices } from "./internal/PrivateWorkbenchServices";
import { EnsembleUpdateMonitor } from "./internal/WorkbenchSession/EnsembleUpdateMonitor";
import { PrivateWorkbenchSession } from "./internal/WorkbenchSession/PrivateWorkbenchSession";
import { localStorageKeyForSessionId } from "./internal/WorkbenchSession/utils";
import { loadWorkbenchSessionFromLocalStorage } from "./internal/WorkbenchSession/WorkbenchSessionLoader";
import type { Template } from "./TemplateRegistry";
import type { WorkbenchServices } from "./WorkbenchServices";

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

        this._guiMessageBroker.setState(GuiState.SessionHasUnsavedChanges, false);
        this._guiMessageBroker.setState(GuiState.SaveSessionDialogOpen, false);
        this._workbenchSession = null;
        this._publishSubscribeDelegate.notifySubscribers(WorkbenchTopic.HAS_ACTIVE_SESSION);
    }

    async openSessionFromLocalStorage(snapshotId: string | null, forceOpen = false): Promise<void> {
        if (this._workbenchSession && !forceOpen) {
            console.warn("A workbench session is already active. Please close it before opening a new one.");
            return;
        }

        this._guiMessageBroker.setState(GuiState.IsLoadingSession, true);

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
        this._guiMessageBroker.setState(GuiState.MultiSessionsRecoveryDialogOpen, false);
        this._guiMessageBroker.setState(GuiState.ActiveSessionRecoveryDialogOpen, false);
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
            await this._ensembleUpdateMonitor.pollImmediately();
            this._ensembleUpdateMonitor.startPolling();
            this._publishSubscribeDelegate.notifySubscribers(WorkbenchTopic.HAS_ACTIVE_SESSION);
            this._publishSubscribeDelegate.notifySubscribers(WorkbenchTopic.ACTIVE_SESSION);
        } catch (error) {
            console.error("Failed to hydrate workbench session:", error);
            throw new Error("Could not load workbench session from data container.");
        } finally {
            this._guiMessageBroker.setState(GuiState.SessionHasUnsavedChanges, false);
            this._guiMessageBroker.setState(GuiState.SaveSessionDialogOpen, false);
        }
    }

    async startNewSession(): Promise<void> {
        if (this._workbenchSession) {
            console.warn("A workbench session is already active. Please close it before starting a new one.");
            return;
        }

        const session = new PrivateWorkbenchSession(this._atomStoreMaster, this._queryClient);
        session.makeDefaultDashboard();

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

    beforeDestroy(): void {
        return;
    }

    clear(): void {
        // this._workbenchSession.clear();
    }

    applyTemplate(template: Template): void {
        if (!this._workbenchSession) {
            throw new Error("No active workbench session.");
        }

        const dashboard = this._workbenchSession.getActiveDashboard();
        dashboard.applyTemplate(template);
    }
}
