import type { QueryClient } from "@tanstack/react-query";

import { PublishSubscribeDelegate, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";

import { AtomStoreMaster } from "./AtomStoreMaster";
import { GuiMessageBroker, GuiState } from "./GuiMessageBroker";
import { PrivateWorkbenchServices } from "./internal/PrivateWorkbenchServices";
import { PrivateWorkbenchSettings } from "./internal/PrivateWorkbenchSettings";
import { PrivateWorkbenchSession } from "./internal/WorkbenchSession/PrivateWorkbenchSession";
import {
    loadWorkbenchSessionFromBackend,
    loadWorkbenchSessionFromLocalStorage,
} from "./internal/WorkbenchSession/WorkbenchSessionLoader";
import { WorkbenchSessionPersistenceService } from "./internal/WorkbenchSession/WorkbenchSessionPersistenceService";
import type { WorkbenchServices } from "./WorkbenchServices";

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
    private _workbenchSettings: PrivateWorkbenchSettings;
    private _guiMessageBroker: GuiMessageBroker;
    private _atomStoreMaster: AtomStoreMaster;
    private _queryClient: QueryClient;
    private _workbenchSessionPersistenceService: WorkbenchSessionPersistenceService;

    constructor(queryClient: QueryClient) {
        this._queryClient = queryClient;
        this._atomStoreMaster = new AtomStoreMaster();
        this._workbenchServices = new PrivateWorkbenchServices(this);
        this._workbenchSettings = new PrivateWorkbenchSettings();
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
        const session = await loadWorkbenchSessionFromLocalStorage(this._atomStoreMaster, this._queryClient);
        if (session) {
            this.setWorkbenchSession(session);
        }
    }

    async openSession(sessionId: string): Promise<void> {
        if (this._workbenchSession) {
            console.warn("A workbench session is already active. Please close it before opening a new one.");
            return;
        }

        const session = await loadWorkbenchSessionFromBackend(this._atomStoreMaster, this._queryClient, sessionId);
        await this._workbenchSessionPersistenceService.setWorkbenchSession(session);
        this.setWorkbenchSession(session);
    }

    async saveCurrentSession(forceSave = false): Promise<void> {
        if (!this._workbenchSession) {
            throw new Error("No active workbench session to save.");
        }

        if (this._workbenchSession.getIsPersisted() || forceSave) {
            this._guiMessageBroker.setState(GuiState.IsSavingSession, true);
            await this._workbenchSessionPersistenceService.persistSessionState();
            this._guiMessageBroker.setState(GuiState.IsSavingSession, false);
            return;
        }

        this._guiMessageBroker.setState(GuiState.SessionHasUnsavedChanges, false);
        this._guiMessageBroker.setState(GuiState.SaveSessionDialogOpen, true);
    }

    private setWorkbenchSession(session: PrivateWorkbenchSession): void {
        if (this._workbenchSession) {
            console.warn(
                "A workbench session is already active. Closing the current session before setting a new one.",
            );
            this.closeCurrentSession();
        }

        this._workbenchSession = session;
        this._publishSubscribeDelegate.notifySubscribers(WorkbenchTopic.HAS_ACTIVE_SESSION);
    }

    async startNewSession(): Promise<void> {
        if (this._workbenchSession) {
            console.warn("A workbench session is already active. Please close it before starting a new one.");
            return;
        }

        const session = new PrivateWorkbenchSession(this._atomStoreMaster, this._queryClient);
        session.makeDefaultDashboard();
        await this._workbenchSessionPersistenceService.setWorkbenchSession(session);

        this.setWorkbenchSession(session);
    }

    maybeCloseCurrentSession(): void {
        if (!this._workbenchSession) {
            console.warn("No active workbench session to close.");
            return;
        }

        if (this._workbenchSessionPersistenceService.hasChanges()) {
            this._guiMessageBroker.setState(GuiState.SessionHasUnsavedChanges, true);
            return;
        }

        this.closeCurrentSession();
    }

    closeCurrentSession(): void {
        if (!this._workbenchSession) {
            console.warn("No active workbench session to close.");
            return;
        }

        this._workbenchSession.removeFromLocalStorage();
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

    getWorkbenchSettings(): PrivateWorkbenchSettings {
        return this._workbenchSettings;
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
