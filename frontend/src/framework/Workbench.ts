import type { QueryClient } from "@tanstack/react-query";

import { PublishSubscribeDelegate, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";

import { AtomStoreMaster } from "./AtomStoreMaster";
import { GuiMessageBroker, GuiState, LeftDrawerContent } from "./GuiMessageBroker";
import { PrivateWorkbenchServices } from "./internal/PrivateWorkbenchServices";
import { PrivateWorkbenchSession } from "./internal/WorkbenchSession/PrivateWorkbenchSession";
import {
    loadAllWorkbenchSessionsFromLocalStorage,
    loadWorkbenchSessionFromBackend,
    loadWorkbenchSessionFromLocalStorage,
} from "./internal/WorkbenchSession/WorkbenchSessionLoader";
import { WorkbenchSessionPersistenceService } from "./internal/WorkbenchSession/WorkbenchSessionPersistenceService";
import type { WorkbenchServices } from "./WorkbenchServices";
import { localStorageKeyForSessionId } from "./internal/WorkbenchSession/utils";

export type StoredUserEnsembleSetting = {
    ensembleIdent: string;
    customName: string | null;
    color: string;
};

export type StoredUserDeltaEnsembleSetting = {
    comparisonEnsembleIdent: string;
    referenceEnsembleIdent: string;
    customName: string | null;
    color: string;
};

export enum WorkbenchTopic {
    HAS_ACTIVE_SESSION = "hasActiveSession",
}

export type WorkbenchTopicPayloads = {
    [WorkbenchTopic.HAS_ACTIVE_SESSION]: boolean;
};
export class Workbench implements PublishSubscribe<WorkbenchTopicPayloads> {
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<WorkbenchTopicPayloads>();

    private _workbenchSession: PrivateWorkbenchSession | null = null;
    private _workbenchServices: PrivateWorkbenchServices;
    private _guiMessageBroker: GuiMessageBroker;
    private _atomStoreMaster: AtomStoreMaster;
    private _queryClient: QueryClient;
    private _workbenchSessionPersistenceService: WorkbenchSessionPersistenceService;

    constructor(queryClient: QueryClient) {
        this._queryClient = queryClient;
        this._atomStoreMaster = new AtomStoreMaster();
        this._workbenchServices = new PrivateWorkbenchServices(this);
        this._workbenchSessionPersistenceService = new WorkbenchSessionPersistenceService(this);
        this._guiMessageBroker = new GuiMessageBroker();
    }

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<WorkbenchTopicPayloads> {
        return this._publishSubscribeDelegate;
    }

    makeSnapshotGetter<T extends WorkbenchTopic>(topic: T): () => WorkbenchTopicPayloads[T] {
        const snapshotGetter = (): any => {
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

    getWorkbenchSessionPersistenceService(): WorkbenchSessionPersistenceService {
        return this._workbenchSessionPersistenceService;
    }

    async initialize() {
        const storedSessions = await loadAllWorkbenchSessionsFromLocalStorage(this._atomStoreMaster, this._queryClient);
        if (storedSessions.length === 0) {
            return;
        }

        this._guiMessageBroker.setState(GuiState.RecoveryDialogOpen, true);
    }

    discardLocalStorageSession(sessionId: string | null): void {
        const key = localStorageKeyForSessionId(sessionId);
        localStorage.removeItem(key);
        this._guiMessageBroker.setState(GuiState.RecoveryDialogOpen, false);
        this._guiMessageBroker.setState(GuiState.SessionHasUnsavedChanges, false);
        this._guiMessageBroker.setState(GuiState.SaveSessionDialogOpen, false);
        this._workbenchSessionPersistenceService.removeWorkbenchSession();
        this._workbenchSession = null;
        this._publishSubscribeDelegate.notifySubscribers(WorkbenchTopic.HAS_ACTIVE_SESSION);
    }

    async openSessionFromLocalStorage(sessionId: string | null): Promise<void> {
        if (this._workbenchSession) {
            console.warn("A workbench session is already active. Please close it before opening a new one.");
            return;
        }

        const session = await loadWorkbenchSessionFromLocalStorage(sessionId, this._atomStoreMaster, this._queryClient);
        if (!session) {
            console.warn("No workbench session found in local storage.");
            return;
        }

        await this.setWorkbenchSession(session);
        this._guiMessageBroker.setState(GuiState.RecoveryDialogOpen, false);
    }

    async openSession(sessionId: string): Promise<void> {
        if (this._workbenchSession) {
            console.warn("A workbench session is already active. Please close it before opening a new one.");
            return;
        }

        const session = await loadWorkbenchSessionFromBackend(this._atomStoreMaster, this._queryClient, sessionId);
        await this.setWorkbenchSession(session);
    }

    async saveCurrentSession(forceSave = false): Promise<void> {
        if (!this._workbenchSession) {
            throw new Error("No active workbench session to save.");
        }

        if (this._workbenchSession.getIsPersisted() || forceSave) {
            this._guiMessageBroker.setState(GuiState.IsSavingSession, true);
            await this._workbenchSessionPersistenceService.persistSessionState();
            this._guiMessageBroker.setState(GuiState.IsSavingSession, false);
            this._guiMessageBroker.setState(GuiState.SaveSessionDialogOpen, false);
            this._guiMessageBroker.setState(GuiState.SessionHasUnsavedChanges, false);
            return;
        }

        this._guiMessageBroker.setState(GuiState.SessionHasUnsavedChanges, false);
        this._guiMessageBroker.setState(GuiState.SaveSessionDialogOpen, true);
    }

    private async setWorkbenchSession(session: PrivateWorkbenchSession): Promise<void> {
        if (this._workbenchSession) {
            console.warn("A workbench session is already active.");
            return;
        }

        if (session.getEnsembleSet().getEnsembleArray().length === 0) {
            this._guiMessageBroker.setState(GuiState.EnsembleDialogOpen, true);
        }

        if (session.getActiveDashboard().getLayout().length === 0) {
            this._guiMessageBroker.setState(GuiState.LeftDrawerContent, LeftDrawerContent.ModulesList);
        } else {
            this._guiMessageBroker.setState(GuiState.LeftDrawerContent, LeftDrawerContent.ModuleSettings);
        }

        this._workbenchSession = session;
        await this._workbenchSessionPersistenceService.setWorkbenchSession(session);
        this._publishSubscribeDelegate.notifySubscribers(WorkbenchTopic.HAS_ACTIVE_SESSION);

        this._guiMessageBroker.setState(GuiState.SessionHasUnsavedChanges, false);
        this._guiMessageBroker.setState(GuiState.SaveSessionDialogOpen, false);
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

    maybeCloseCurrentSession(): boolean {
        if (!this._workbenchSession) {
            console.warn("No active workbench session to close.");
            return true;
        }

        if (this._workbenchSessionPersistenceService.hasChanges() || !this._workbenchSession.getIsPersisted()) {
            this._guiMessageBroker.setState(GuiState.SessionHasUnsavedChanges, true);
            return false;
        }

        this.closeCurrentSession();
        return true;
    }

    closeCurrentSession(): void {
        if (!this._workbenchSession) {
            console.warn("No active workbench session to close.");
            return;
        }

        this._workbenchSession.beforeDestroy();
        this._workbenchSessionPersistenceService.removeWorkbenchSession();
        this._workbenchSession = null;

        this._publishSubscribeDelegate.notifySubscribers(WorkbenchTopic.HAS_ACTIVE_SESSION);
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

    clear(): void {
        // this._workbenchSession.clear();
    }

    /*
    applyTemplate(template: Template): void {
        this.clearLayout();

        const newLayout = template.moduleInstances.map((el) => {
            return { ...el.layout, moduleName: el.moduleName };
        });

        this.makeLayout(newLayout);

        for (let i = 0; i < this._moduleInstances.length; i++) {
            const moduleInstance = this._moduleInstances[i];
            const templateModule = template.moduleInstances[i];
            if (templateModule.syncedSettings) {
                for (const syncSettingKey of templateModule.syncedSettings) {
                    moduleInstance.addSyncedSetting(syncSettingKey);
                }
            }

            const initialSettings: Record<string, unknown> = templateModule.initialSettings || {};

            if (templateModule.dataChannelsToInitialSettingsMapping) {
                for (const propName of Object.keys(templateModule.dataChannelsToInitialSettingsMapping)) {
                    const dataChannel = templateModule.dataChannelsToInitialSettingsMapping[propName];

                    const moduleInstanceIndex = template.moduleInstances.findIndex(
                        (el) => el.instanceRef === dataChannel.listensToInstanceRef,
                    );
                    if (moduleInstanceIndex === -1) {
                        throw new Error("Could not find module instance for data channel");
                    }

                    const listensToModuleInstance = this._moduleInstances[moduleInstanceIndex];
                    const channel = listensToModuleInstance.getChannelManager().getChannel(dataChannel.channelIdString);
                    if (!channel) {
                        throw new Error("Could not find channel");
                    }

                    const receiver = moduleInstance.getChannelManager().getReceiver(propName);

                    if (!receiver) {
                        throw new Error("Could not find receiver");
                    }

                    receiver.subscribeToChannel(channel, "All");
                }
            }

            moduleInstance.setInitialSettings(new InitialSettings(initialSettings));

            if (i === 0) {
                this.getGuiMessageBroker().setState(GuiState.ActiveModuleInstanceId, moduleInstance.getId());
            }
        }

        this.notifySubscribers(WorkbenchEvents.ModuleInstancesChanged);
    }
        */
}
