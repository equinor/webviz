import type { QueryClient } from "@tanstack/react-query";

import { PublishSubscribeDelegate, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";

import { AtomStoreMaster } from "./AtomStoreMaster";
import { confirmationService } from "./ConfirmationService";
import { GuiMessageBroker, GuiState, LeftDrawerContent, RightDrawerContent } from "./GuiMessageBroker";
import { NavigationObserver } from "./internal/NavigationObserver";
import { PrivateWorkbenchServices } from "./internal/PrivateWorkbenchServices";
import { PrivateWorkbenchSession } from "./internal/WorkbenchSession/PrivateWorkbenchSession";
import {
    buildSessionUrl,
    readSessionIdFromUrl,
    removeSessionIdFromUrl,
} from "./internal/WorkbenchSession/SessionUrlService";
import { loadSnapshotFromBackend } from "./internal/WorkbenchSession/SnapshotLoader";
import { readSnapshotIdFromUrl, removeSnapshotIdFromUrl } from "./internal/WorkbenchSession/SnapshotUrlService";
import { localStorageKeyForSessionId } from "./internal/WorkbenchSession/utils";
import {
    loadAllWorkbenchSessionsFromLocalStorage,
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
    private _guiMessageBroker: GuiMessageBroker;
    private _atomStoreMaster: AtomStoreMaster;
    private _queryClient: QueryClient;
    private _workbenchSessionPersistenceService: WorkbenchSessionPersistenceService;
    private _navigationObserver: NavigationObserver;

    constructor(queryClient: QueryClient) {
        this._queryClient = queryClient;
        this._atomStoreMaster = new AtomStoreMaster();
        this._workbenchServices = new PrivateWorkbenchServices(this);
        this._workbenchSessionPersistenceService = new WorkbenchSessionPersistenceService(this);
        this._guiMessageBroker = new GuiMessageBroker();
        this._navigationObserver = new NavigationObserver({
            onBeforeUnload: () => this.isWorkbenchDirty(),
            onNavigate: async () => this.handleNavigation(),
        });
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

    private isWorkbenchDirty(): boolean {
        if (!this._workbenchSession) {
            return false; // No active session, so nothing to save.
        }

        return (
            (this._workbenchSessionPersistenceService.hasChanges() || !this._workbenchSession.getIsPersisted()) &&
            !this._workbenchSession.isSnapshot()
        );
    }

    async handleNavigation(): Promise<boolean> {
        // When the user navigates with forward/backward buttons, they might want to load a snapshot. In this case,
        // we first have to check if a snapshot id is present in the URL.
        // If it is, we have to check for unsaved changes and then load the snapshot.
        const snapshotId = readSnapshotIdFromUrl();
        const sessionId = readSessionIdFromUrl();
        if (!snapshotId && !sessionId) {
            // No snapshot/session id in URL, so we can proceed with the navigation - if a session is active, it will be closed.
            if (this._workbenchSession) {
                await this.maybeCloseCurrentSession();
                return true; // Proceed with the navigation.
            }
        }

        if (this._workbenchSession) {
            if (this._workbenchSession.isSnapshot()) {
                // If the current session is a snapshot, we can just load the new entity.
                if (snapshotId) {
                    await this.loadSnapshot(snapshotId);
                } else if (sessionId) {
                    if (this._workbenchSession.getId() === sessionId) {
                        // If the session id is the same as the current session, we do not need to reload it.
                        return true; // Proceed with the navigation.
                    }
                    await this.openSession(sessionId);
                }
                return true; // Proceed with the navigation.
            }

            // If the current session is not a snapshot, we have to check for unsaved changes.
            if (this._workbenchSessionPersistenceService.hasChanges() || !this._workbenchSession.getIsPersisted()) {
                // If there are unsaved changes, we show a dialog to the user to confirm if they want to discard the
                // current session and load the new one.
                const result = await confirmationService.confirm({
                    title: "Unsaved Changes",
                    message: "You have unsaved changes in your current session. Do you want to save or discard them?",
                    actions: [
                        { id: "save", label: "Save Changes", color: "success" },
                        { id: "discard", label: "Discard Changes", color: "danger" },
                        { id: "cancel", label: "Cancel" },
                    ],
                });

                if (result === "cancel") {
                    // User chose to cancel the navigation, so we do nothing.
                    return false;
                }
                if (result === "save") {
                    // User chose to save the changes, so we save the current session and then load the new snapshot.
                    await this.saveCurrentSession(true);
                    if (snapshotId) {
                        await this.loadSnapshot(snapshotId);
                    } else if (sessionId) {
                        await this.openSession(sessionId);
                    }
                    return true; // Proceed with the navigation.
                }
                if (result === "discard") {
                    // User chose to discard the changes, so we discard the current session and load the new snapshot.
                    this.unloadCurrentSession();
                    if (snapshotId) {
                        await this.loadSnapshot(snapshotId);
                    } else if (sessionId) {
                        await this.openSession(sessionId);
                    }
                    return true; // Proceed with the navigation.
                }

                throw new Error(`Unexpected confirmation result: ${result}`);
            }
        }

        // If there are no unsaved changes or no active session, we can just load the new snapshot or session.
        if (snapshotId) {
            await this.loadSnapshot(snapshotId);
        } else if (sessionId) {
            await this.openSession(sessionId);
        }
        return true; // Proceed with the navigation.
    }

    async initialize() {
        // First, check if a snapshot id is provided in the URL
        const snapshotId = readSnapshotIdFromUrl();
        const sessionId = readSessionIdFromUrl();
        if (snapshotId) {
            this.loadSnapshot(snapshotId);
        } else if (sessionId) {
            this.openSession(sessionId);
        }

        const storedSessions = await loadAllWorkbenchSessionsFromLocalStorage(this._atomStoreMaster, this._queryClient);
        if (storedSessions.length === 0) {
            return;
        }

        this._guiMessageBroker.setState(GuiState.RecoveryDialogOpen, true);
    }

    private async loadSnapshot(snapshotId: string): Promise<void> {
        try {
            const snapshot = await loadSnapshotFromBackend(this._atomStoreMaster, this._queryClient, snapshotId);
            await this.setWorkbenchSession(snapshot);
            if (this.getGuiMessageBroker().getState(GuiState.LeftDrawerContent) !== LeftDrawerContent.ModuleSettings) {
                this._guiMessageBroker.setState(GuiState.LeftDrawerContent, LeftDrawerContent.ModuleSettings);
            }
            if (this.getGuiMessageBroker().getState(GuiState.RightDrawerContent) === RightDrawerContent.ModulesList) {
                this._guiMessageBroker.setState(
                    GuiState.RightDrawerContent,
                    RightDrawerContent.RealizationFilterSettings,
                );
                this._guiMessageBroker.setState(GuiState.RightSettingsPanelWidthInPercent, 0);
            }
            return;
        } catch (error) {
            console.error("Failed to load session from backend:", error);
        }
    }

    makeSessionFromSnapshot(): void {
        if (!this._workbenchSession) {
            throw new Error("No active workbench session.");
        }

        this._workbenchSessionPersistenceService.removeWorkbenchSession();
        this._workbenchSession.setMetadata({
            title: "New Session from Snapshot",
            description: undefined,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            lastModifiedMs: Date.now(),
        });
        this._workbenchSession.setIsSnapshot(false);
        this._workbenchSessionPersistenceService.setWorkbenchSession(this._workbenchSession);
        removeSnapshotIdFromUrl();
    }

    discardLocalStorageSession(snapshotId: string | null): void {
        const key = localStorageKeyForSessionId(snapshotId);
        localStorage.removeItem(key);
        this._guiMessageBroker.setState(GuiState.SessionHasUnsavedChanges, false);
        this._guiMessageBroker.setState(GuiState.SaveSessionDialogOpen, false);
        this._workbenchSessionPersistenceService.removeWorkbenchSession();
        this._workbenchSession = null;
        this._publishSubscribeDelegate.notifySubscribers(WorkbenchTopic.HAS_ACTIVE_SESSION);
    }

    async openSessionFromLocalStorage(snapshotId: string | null): Promise<void> {
        if (this._workbenchSession) {
            console.warn("A workbench session is already active. Please close it before opening a new one.");
            return;
        }

        const session = await loadWorkbenchSessionFromLocalStorage(
            snapshotId,
            this._atomStoreMaster,
            this._queryClient,
        );
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

        this._guiMessageBroker.setState(GuiState.IsLoadingSession, true);

        const url = buildSessionUrl(sessionId);
        window.history.pushState({}, "", url);

        try {
            const session = await loadWorkbenchSessionFromBackend(this._atomStoreMaster, this._queryClient, sessionId);
            await this.setWorkbenchSession(session);
        } catch (e) {
            this._guiMessageBroker.setState(GuiState.IsLoadingSession, false);
            const result = await confirmationService.confirm({
                title: "Could not load session",
                message: `Could not load session with ID ${sessionId}. The session might not exist or you might not have access to it.`,
                actions: [
                    {
                        id: "cancel",
                        label: "Cancel",
                    },
                    {
                        id: "retry",
                        label: "Retry",
                    },
                ],
            });
            if (result === "retry") {
                // Retry loading the session
                await this.openSession(sessionId);
            }
        } finally {
            this._guiMessageBroker.setState(GuiState.IsLoadingSession, false);
        }
    }

    async makeSnapshot(title: string, description: string): Promise<string | null> {
        if (!this._workbenchSession) {
            throw new Error("No active workbench session to make a snapshot.");
        }

        this._guiMessageBroker.setState(GuiState.IsMakingSnapshot, true);

        const snapshotId = await this._workbenchSessionPersistenceService.makeSnapshot(title, description);
        this._guiMessageBroker.setState(GuiState.IsMakingSnapshot, false);

        return snapshotId;
    }

    async saveCurrentSession(forceSave = false): Promise<void> {
        if (!this._workbenchSession) {
            throw new Error("No active workbench session to save.");
        }

        if (this._workbenchSession.getIsPersisted() || forceSave) {
            this._guiMessageBroker.setState(GuiState.IsSavingSession, true);
            const wasPersisted = this._workbenchSession.getIsPersisted();
            await this._workbenchSessionPersistenceService.persistSessionState();
            const id = this._workbenchSession.getId();
            if (!wasPersisted && id) {
                const url = buildSessionUrl(id);
                window.history.pushState({}, "", url);
            }
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

        this._guiMessageBroker.setState(GuiState.LeftDrawerContent, LeftDrawerContent.ModuleSettings);

        if (session.getActiveDashboard().getLayout().length === 0) {
            this._guiMessageBroker.setState(GuiState.RightDrawerContent, RightDrawerContent.ModulesList);
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

    async maybeCloseCurrentSession(): Promise<boolean> {
        if (!this._workbenchSession) {
            console.warn("No active workbench session to close.");
            return true;
        }

        if (
            (this._workbenchSessionPersistenceService.hasChanges() || !this._workbenchSession.getIsPersisted()) &&
            !this._workbenchSession.isSnapshot()
        ) {
            const result = await confirmationService.confirm({
                title: "Unsaved Changes",
                message: "You have unsaved changes in your current session. Do you want to save them before closing?",
                actions: [
                    { id: "cancel", label: "Cancel" },
                    { id: "discard", label: "Discard Changes", color: "danger" },
                    { id: "save", label: "Save Changes", color: "success" },
                ],
            });

            if (result === "cancel") {
                // User chose to cancel the close operation, so we do nothing.
                return false;
            }
            if (result === "save") {
                // User chose to save the changes, so we save the current session and then close it
                if (!this._workbenchSession.getIsPersisted()) {
                    this._guiMessageBroker.setState(GuiState.SaveSessionDialogOpen, true);
                    return false; // Do not proceed with the close operation, wait for the user to save
                }
                await this.saveCurrentSession(true);
                this.closeCurrentSession();
                return true; // Proceed with the close operation.
            }
            if (result === "discard") {
                // User chose to discard the changes, so we unload the current session and close it.
                this.closeCurrentSession();
                return true; // Proceed with the close operation.
            }

            throw new Error(`Unexpected confirmation result: ${result}`);
        }

        this.closeCurrentSession();
        return true;
    }

    async maybeRefreshSession(): Promise<void> {
        if (!this._workbenchSession) {
            console.warn("No active workbench session to refresh.");
            return;
        }

        if (this._workbenchSession.isSnapshot() || !this._workbenchSession.getIsPersisted()) {
            throw new Error("Cannot refresh a snapshot or non-persisted session.");
        }

        const sessionId = this._workbenchSession.getId();

        if (!sessionId) {
            throw new Error("Cannot refresh session without a valid session ID.");
        }

        if (
            (this._workbenchSessionPersistenceService.hasChanges() || !this._workbenchSession.getIsPersisted()) &&
            !this._workbenchSession.isSnapshot()
        ) {
            const result = await confirmationService.confirm({
                title: "Unsaved Changes",
                message:
                    "You have unsaved changes in your current session. By refreshing, you will lose these changes. Do you want to proceed?",
                actions: [
                    { id: "cancel", label: "Cancel" },
                    { id: "discard", label: "Discard & Refresh", color: "danger" },
                ],
            });

            if (result === "cancel") {
                // User chose to cancel the close operation, so we do nothing.
                return;
            }
            if (result === "discard") {
                // User chose to discard the changes, so we unload the current session and refresh it.
                this.unloadCurrentSession();
                await this.openSession(sessionId);
                return;
            }

            throw new Error(`Unexpected confirmation result: ${result}`);
        }

        this.unloadCurrentSession();
        await this.openSession(sessionId);
    }

    private unloadCurrentSession(): void {
        if (!this._workbenchSession) {
            console.warn("No active workbench session to unload.");
            return;
        }

        this._workbenchSession.beforeDestroy();
        this._workbenchSessionPersistenceService.removeWorkbenchSession();
        this._workbenchSession = null;
    }

    closeCurrentSession(): void {
        if (!this._workbenchSession) {
            console.warn("No active workbench session to close.");
            return;
        }

        removeSnapshotIdFromUrl();
        removeSessionIdFromUrl();
        this.unloadCurrentSession();

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

    beforeDestroy(): void {
        this._navigationObserver.beforeDestroy();
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
