import type { QueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "react-toastify";

import {
    deleteSessionMutation,
    deleteSnapshotMutation,
    getSnapshotAccessLogsQueryKey,
    updateSessionMutation,
    type SessionUpdate_api,
} from "@api";
import { PublishSubscribeDelegate, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";

import { ConfirmationService } from "./ConfirmationService";
import { GuiMessageBroker, GuiState, LeftDrawerContent, RightDrawerContent } from "./GuiMessageBroker";
import { Dashboard } from "./internal/Dashboard";
import { EnsembleUpdateMonitor } from "./internal/EnsembleUpdateMonitor";
import { NavigationObserver } from "./internal/NavigationObserver";
import { PrivateWorkbenchServices } from "./internal/PrivateWorkbenchServices";
import { PrivateWorkbenchSession } from "./internal/WorkbenchSession/PrivateWorkbenchSession";
import {
    removeSessionQueryData,
    removeSnapshotQueryData,
    replaceSessionQueryData,
} from "./internal/WorkbenchSession/utils/crudHelpers";
import {
    loadAllWorkbenchSessionsFromLocalStorage,
    loadSnapshotFromBackend,
    loadWorkbenchSessionFromBackend,
    loadWorkbenchSessionFromLocalStorage,
} from "./internal/WorkbenchSession/utils/loaders";
import { localStorageKeyForSessionId } from "./internal/WorkbenchSession/utils/localStorageHelpers";
import {
    buildSessionUrl,
    readSessionIdFromUrl,
    readSnapshotIdFromUrl,
    removeSessionIdFromUrl,
    removeSnapshotIdFromUrl,
} from "./internal/WorkbenchSession/utils/url";
import { WorkbenchSessionPersistenceService } from "./internal/WorkbenchSessionPersistenceService";
import type { Template } from "./TemplateRegistry";
import { ApiErrorHelper } from "./utils/ApiErrorHelper";
import type { WorkbenchServices } from "./WorkbenchServices";
import { SessionValidationError } from "./internal/WorkbenchSession/utils/deserialization";

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
    private _queryClient: QueryClient;
    private _workbenchSessionPersistenceService: WorkbenchSessionPersistenceService;
    private _navigationObserver: NavigationObserver;
    private _ensembleUpdateMonitor: EnsembleUpdateMonitor;
    private _isInitialized: boolean = false;

    constructor(queryClient: QueryClient) {
        this._queryClient = queryClient;
        this._workbenchServices = new PrivateWorkbenchServices(this);
        this._guiMessageBroker = new GuiMessageBroker();
        this._ensembleUpdateMonitor = new EnsembleUpdateMonitor(queryClient, this);

        this._navigationObserver = new NavigationObserver({
            onBeforeUnload: () => this.isWorkbenchDirty(),
            onNavigate: async () => this.handleNavigation(),
        });

        this._workbenchSessionPersistenceService = new WorkbenchSessionPersistenceService(this);
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
                    await this.openSnapshot(snapshotId);
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
                const result = await ConfirmationService.confirm({
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
                        await this.openSnapshot(snapshotId);
                    } else if (sessionId) {
                        await this.openSession(sessionId);
                    }
                    return true; // Proceed with the navigation.
                }
                if (result === "discard") {
                    // User chose to discard the changes, so we discard the current session and load the new snapshot.
                    this.unloadCurrentSession();
                    if (snapshotId) {
                        await this.openSnapshot(snapshotId);
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
            await this.openSnapshot(snapshotId);
        } else if (sessionId) {
            await this.openSession(sessionId);
        }
        return true; // Proceed with the navigation.
    }

    async initialize() {
        if (this._isInitialized) {
            console.info(
                "Workbench is already initialized. This might happen in strict mode due to useEffects being called multiple times.",
            );
            return;
        }

        this._isInitialized = true;

        // First, check if a snapshot id is provided in the URL
        const snapshotId = readSnapshotIdFromUrl();
        const sessionId = readSessionIdFromUrl();

        const storedSessions = await loadAllWorkbenchSessionsFromLocalStorage();

        if (snapshotId) {
            this.openSnapshot(snapshotId);
            return;
        } else if (sessionId) {
            this.openSession(sessionId);
            if (storedSessions.find((el) => el.id === sessionId)) {
                this._guiMessageBroker.setState(GuiState.ActiveSessionRecoveryDialogOpen, true);
            }
            return;
        }

        if (storedSessions.length > 0) {
            this._guiMessageBroker.setState(GuiState.MultiSessionsRecoveryDialogOpen, true);
        }
    }

    async openSnapshot(snapshotId: string): Promise<void> {
        try {
            this._guiMessageBroker.setState(GuiState.IsLoadingSession, true);
            const snapshotData = await loadSnapshotFromBackend(this._queryClient, snapshotId);
            const snapshot = await PrivateWorkbenchSession.fromDataContainer(this._queryClient, snapshotData);
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
            this._guiMessageBroker.setState(GuiState.IsLoadingSession, false);
            return;
        } catch (error: any) {
            this._guiMessageBroker.setState(GuiState.IsLoadingSession, false);
            console.error("Failed to load snapshot from backend:", error);

            if (isAxiosError(error)) {
                // Handle Axios error specifically
                console.error("Axios error details:", error.response?.data);
            }

            const apiError = ApiErrorHelper.fromError(error);

            const result = await ConfirmationService.confirm({
                title: "Could not load snapshot",
                message: apiError?.getMessage() ?? "Could not open snapshot",
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
                this._guiMessageBroker.setState(GuiState.IsLoadingSession, true);
                // Retry loading the snapshot
                await this.openSnapshot(snapshotId);
            }
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
        this._workbenchSession.setIsPersisted(false);
        this._workbenchSessionPersistenceService.setWorkbenchSession(this._workbenchSession);
        removeSnapshotIdFromUrl();
    }

    discardLocalStorageSession(snapshotId: string | null, unloadSession = true): void {
        const key = localStorageKeyForSessionId(snapshotId);
        localStorage.removeItem(key);

        if (!unloadSession) {
            return;
        }

        this._guiMessageBroker.setState(GuiState.SessionHasUnsavedChanges, false);
        this._guiMessageBroker.setState(GuiState.SaveSessionDialogOpen, false);
        this._workbenchSessionPersistenceService.removeWorkbenchSession();
        this._workbenchSession = null;
        this._publishSubscribeDelegate.notifySubscribers(WorkbenchTopic.HAS_ACTIVE_SESSION);
    }

    async openSessionFromLocalStorage(sessionId: string | null, forceOpen = false): Promise<void> {
        if (this._workbenchSession && !forceOpen) {
            console.warn("A workbench session is already active. Please close it before opening a new one.");
            return;
        }

        try {
            this._guiMessageBroker.setState(GuiState.IsLoadingSession, true);

            const sessionData = await loadWorkbenchSessionFromLocalStorage(sessionId);
            if (!sessionData) {
                console.warn("No workbench session found in local storage.");
                return;
            }

            const session = await PrivateWorkbenchSession.fromDataContainer(this._queryClient, sessionData);

            await this.setWorkbenchSession(session);
            this._guiMessageBroker.setState(GuiState.MultiSessionsRecoveryDialogOpen, false);
            this._guiMessageBroker.setState(GuiState.ActiveSessionRecoveryDialogOpen, false);
            this._guiMessageBroker.setState(GuiState.IsLoadingSession, false);
        } catch (error) {
            console.error("Failed to load workbench session from local storage:", error);
            if (confirm("Could not load workbench session from local storage. Discard corrupted session?")) {
                this.discardLocalStorageSession(sessionId, false);
                this.startNewSession();
            }
        }
        this._guiMessageBroker.setState(GuiState.IsLoadingSession, false);
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
            const sessionData = await loadWorkbenchSessionFromBackend(this._queryClient, sessionId);
            const session = await PrivateWorkbenchSession.fromDataContainer(this._queryClient, sessionData);
            await this.setWorkbenchSession(session);
        } catch (error) {
            console.error("Failed to load session from backend:", error);
            let errorExplanation = "The session might not exist or you might not have access to it.";
            if (error instanceof SessionValidationError) {
                errorExplanation = "The session data is invalid, corrupted or outdated.";
            }
            this._guiMessageBroker.setState(GuiState.IsLoadingSession, false);
            const result = await ConfirmationService.confirm({
                title: "Could not load session",
                message: `Could not load session with ID ${sessionId}. ${errorExplanation}`,
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

    async updateSession(sessionId: string, sessionUpdate: SessionUpdate_api): Promise<boolean> {
        const queryClient = this._queryClient;

        this._guiMessageBroker.setState(GuiState.IsSavingSession, true);

        let success = false;

        await queryClient
            .getMutationCache()
            .build(queryClient, {
                ...updateSessionMutation(),
                onSuccess(data) {
                    replaceSessionQueryData(queryClient, data);
                    toast.success("Session successfully updated.");
                    success = true;
                },
                onError(error) {
                    console.error("Failed to update session:", error);
                    const apiError = ApiErrorHelper.fromError(error);
                    if (!apiError) {
                        toast.error("An unknown error occurred while updating the session.");
                        return;
                    }
                    console.error("API error details:", apiError.getMessage());
                    toast.error(`Failed to update session: ${apiError.getMessage()}`);
                },
            })
            .execute({ path: { session_id: sessionId }, body: sessionUpdate });

        this._guiMessageBroker.setState(GuiState.IsSavingSession, false);

        return success;
    }

    async makeSnapshot(title: string, description: string): Promise<string | null> {
        if (!this._workbenchSession) {
            throw new Error("No active workbench session to make a snapshot.");
        }

        this._guiMessageBroker.setState(GuiState.IsMakingSnapshot, true);

        const snapshotId = await this._workbenchSessionPersistenceService.makeSnapshot(title, description);
        this._guiMessageBroker.setState(GuiState.IsMakingSnapshot, false);

        // Reset this, so it'll fetch fresh copies - is this working without any options?
        this._queryClient.resetQueries({ queryKey: getSnapshotAccessLogsQueryKey() });

        return snapshotId;
    }

    saveCurrentSessionAs(): void {
        if (!this._workbenchSession) {
            throw new Error("No active workbench session to save.");
        }

        this._guiMessageBroker.setState(GuiState.SessionHasUnsavedChanges, false);
        this._guiMessageBroker.setState(GuiState.SaveSessionDialogOpen, true);
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
            await this._workbenchSessionPersistenceService.setWorkbenchSession(session);
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

        const session = PrivateWorkbenchSession.createEmpty(this._queryClient);

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
            const result = await ConfirmationService.confirm({
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
            const result = await ConfirmationService.confirm({
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

        this._ensembleUpdateMonitor.stopPolling();

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

    async deleteSession(sessionId: string): Promise<boolean> {
        const result = await ConfirmationService.confirm({
            title: "Are you sure?",
            message:
                "This session will be deleted. This action can not be reversed. Note that any snapshots made from this session will still be available",
            actions: [
                { id: "cancel", label: "Cancel" },
                { id: "delete", label: "Delete", color: "danger" },
            ],
        });

        if (result !== "delete") return false;

        let success = false;

        try {
            await this._queryClient
                .getMutationCache()
                .build(this._queryClient, {
                    ...deleteSessionMutation(),
                    onSuccess: () => {
                        success = true;
                        removeSessionQueryData(this._queryClient, sessionId);
                    },
                })
                .execute({ path: { session_id: sessionId } });
        } catch (error) {
            toast.error("An error occurred while deleting the session.");
            console.error("Failed to delete session:", error);
        }

        return success;
    }

    async deleteSnapshot(snapshotId: string): Promise<boolean> {
        const result = await ConfirmationService.confirm({
            title: "Are you sure?",
            message: "This snapshot will be deleted. This action can not be reversed.",
            actions: [
                { id: "cancel", label: "Cancel" },
                { id: "delete", label: "Delete", color: "danger" },
            ],
        });

        if (result !== "delete") return false;

        let success = false;

        try {
            await this._queryClient
                .getMutationCache()
                .build(this._queryClient, {
                    ...deleteSnapshotMutation(),
                    onSuccess: () => {
                        success = true;
                        removeSnapshotQueryData(this._queryClient, snapshotId);
                    },
                })
                .execute({ path: { snapshot_id: snapshotId } });
        } catch (error) {
            toast.error("An error occurred while deleting the snapshot.");
            console.error("Failed to delete snapshot:", error);
        }

        return success;
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

    async makeSessionFromTemplate(template: Template): Promise<void> {
        if (this._workbenchSession) {
            this._workbenchSession.clear();
        }

        await this.startNewSession();

        if (!this._workbenchSession) {
            throw new Error("No active workbench session to apply the template to.");
        }

        const dashboard = await Dashboard.fromTemplate(template, this._workbenchSession.getAtomStoreMaster());
        this._workbenchSession.setDashboards([dashboard]);

        this._publishSubscribeDelegate.notifySubscribers(WorkbenchTopic.HAS_ACTIVE_SESSION);
    }
}
