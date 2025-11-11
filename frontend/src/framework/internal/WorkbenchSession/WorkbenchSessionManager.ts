import type { QueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "react-toastify";

import { deleteSessionMutation, deleteSnapshotMutation, updateSessionMutation, type SessionUpdate_api } from "@api";
import { ConfirmationService } from "@framework/ConfirmationService";
import type { GuiMessageBroker } from "@framework/GuiMessageBroker";
import { GuiState, LeftDrawerContent, RightDrawerContent } from "@framework/GuiMessageBroker";
import { ApiErrorHelper } from "@framework/utils/ApiErrorHelper";
import type { Workbench } from "@framework/Workbench";
import { PublishSubscribeDelegate, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";
import { truncateString } from "@lib/utils/strings";

import { EnsembleUpdateMonitor } from "../EnsembleUpdateMonitor";
import { MAX_DESCRIPTION_LENGTH, MAX_TITLE_LENGTH } from "../persistence/constants";
import { PersistenceOrchestrator } from "../persistence/core/PersistenceOrchestrator";
import type { PersistenceNotifier } from "../persistence/ui/PersistenceNotifier";
import { ToastNotifier } from "../persistence/ui/ToastNotifier";

import { PrivateWorkbenchSession } from "./PrivateWorkbenchSession";
import { removeSessionQueryData, removeSnapshotQueryData, replaceSessionQueryData } from "./utils/crudHelpers";
import { SessionValidationError } from "./utils/deserialization";
import {
    loadAllWorkbenchSessionsFromLocalStorage,
    loadSnapshotFromBackend,
    loadWorkbenchSessionFromBackend,
    loadWorkbenchSessionFromLocalStorage,
} from "./utils/loaders";
import { localStorageKeyForSessionId } from "./utils/localStorageHelpers";
import {
    buildSessionUrl,
    buildSnapshotUrl,
    removeSessionIdFromUrl,
    removeSnapshotIdFromUrl,
    readSessionIdFromUrl,
    readSnapshotIdFromUrl,
    UrlError,
} from "./utils/url";

export enum WorkbenchSessionManagerTopic {
    ACTIVE_SESSION = "activeSession",
    HAS_ACTIVE_SESSION = "hasActiveSession",
}

export type WorkbenchSessionManagerTopicPayloads = {
    [WorkbenchSessionManagerTopic.ACTIVE_SESSION]: PrivateWorkbenchSession | null;
    [WorkbenchSessionManagerTopic.HAS_ACTIVE_SESSION]: boolean;
};

/**
 * Manages workbench session lifecycle, persistence, and state.
 *
 * Responsibilities:
 * - Session lifecycle (create, open, close)
 * - Persistence operations (save, snapshot)
 * - Recovery from localStorage
 * - Navigation handling with dirty state
 */
export class WorkbenchSessionManager implements PublishSubscribe<WorkbenchSessionManagerTopicPayloads> {
    private readonly _publishSubscribeDelegate = new PublishSubscribeDelegate<WorkbenchSessionManagerTopicPayloads>();
    private readonly _workbench: Workbench;
    private readonly _queryClient: QueryClient;
    private readonly _guiMessageBroker: GuiMessageBroker;
    private readonly _notifier: PersistenceNotifier;
    private readonly _ensembleUpdateMonitor: EnsembleUpdateMonitor;

    private _activeSession: PrivateWorkbenchSession | null = null;
    private _persistenceOrchestrator: PersistenceOrchestrator | null = null;

    constructor(
        workbench: Workbench,
        queryClient: QueryClient,
        guiMessageBroker: GuiMessageBroker,
        notifier?: PersistenceNotifier,
    ) {
        this._workbench = workbench;
        this._queryClient = queryClient;
        this._guiMessageBroker = guiMessageBroker;
        this._notifier = notifier ?? ToastNotifier;

        this._ensembleUpdateMonitor = new EnsembleUpdateMonitor(queryClient, this);
    }

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<WorkbenchSessionManagerTopicPayloads> {
        return this._publishSubscribeDelegate;
    }

    makeSnapshotGetter<T extends WorkbenchSessionManagerTopic>(
        topic: T,
    ): () => WorkbenchSessionManagerTopicPayloads[T] {
        return (): WorkbenchSessionManagerTopicPayloads[T] => {
            if (topic === WorkbenchSessionManagerTopic.ACTIVE_SESSION) {
                return this._activeSession as WorkbenchSessionManagerTopicPayloads[T];
            }
            if (topic === WorkbenchSessionManagerTopic.HAS_ACTIVE_SESSION) {
                return (this._activeSession !== null) as WorkbenchSessionManagerTopicPayloads[T];
            }
            throw new Error(`Unknown topic: ${topic}`);
        };
    }

    // ========== State Queries ==========

    getActiveSession(): PrivateWorkbenchSession {
        if (!this._activeSession) {
            throw new Error("No active workbench session.");
        }
        return this._activeSession;
    }

    getActiveSessionOrNull(): PrivateWorkbenchSession | null {
        return this._activeSession;
    }

    hasActiveSession(): boolean {
        return this._activeSession !== null;
    }

    hasDirtyChanges(): boolean {
        if (!this._activeSession || !this._persistenceOrchestrator) {
            return false;
        }
        // Session has changes if persistence orchestrator reports changes or session is not persisted
        // But snapshots are never considered dirty
        return (
            (this._persistenceOrchestrator.hasChanges() || !this._activeSession.getIsPersisted()) &&
            !this._activeSession.isSnapshot()
        );
    }

    getPersistenceOrchestrator(): PersistenceOrchestrator | null {
        return this._persistenceOrchestrator;
    }

    beforeDestroy(): void {
        this._persistenceOrchestrator?.stop();
        this._ensembleUpdateMonitor.stopPolling();
        this.unloadSession();
    }

    // ========== Session Lifecycle ==========

    async startNewSession(): Promise<PrivateWorkbenchSession> {
        if (this._activeSession) {
            throw new Error("A workbench session is already active. Please close it before starting a new one.");
        }

        const session = PrivateWorkbenchSession.createEmpty(this._queryClient);
        await this.setActiveSession(session);
        return session;
    }

    async openSession(sessionId: string): Promise<PrivateWorkbenchSession> {
        if (this._activeSession) {
            throw new Error("A workbench session is already active. Please close it before opening a new one.");
        }

        try {
            this._guiMessageBroker.setState(GuiState.IsLoadingSession, true);

            const url = buildSessionUrl(sessionId);
            window.history.pushState({}, "", url);

            const sessionData = await loadWorkbenchSessionFromBackend(this._queryClient, sessionId);
            const session = await PrivateWorkbenchSession.fromDataContainer(this._queryClient, sessionData);
            await this.setActiveSession(session);
            return session;
        } catch (error) {
            console.error("Failed to load session from backend:", error);
            let errorExplanation = "The session might not exist or you might not have access to it.";
            if (error instanceof SessionValidationError) {
                errorExplanation = "The session data is invalid, corrupted or outdated.";
            }

            const result = await ConfirmationService.confirm({
                title: "Could not load session",
                message: `Could not load session with ID '${sessionId}'. ${errorExplanation}`,
                actions: [
                    { id: "cancel", label: "Cancel" },
                    { id: "retry", label: "Retry" },
                ],
            });

            if (result === "retry") {
                return await this.openSession(sessionId);
            }
            if (result === "cancel") {
                removeSessionIdFromUrl();
            }
            throw error;
        } finally {
            this._guiMessageBroker.setState(GuiState.IsLoadingSession, false);
        }
    }

    async openSnapshot(snapshotId: string): Promise<PrivateWorkbenchSession> {
        try {
            this._guiMessageBroker.setState(GuiState.IsLoadingSnapshot, true);

            const url = buildSnapshotUrl(snapshotId);
            window.history.pushState({}, "", url);

            const snapshotData = await loadSnapshotFromBackend(this._queryClient, snapshotId);
            const snapshot = await PrivateWorkbenchSession.fromDataContainer(this._queryClient, snapshotData);
            await this.setActiveSession(snapshot);

            // Update GUI state for snapshots
            if (this._guiMessageBroker.getState(GuiState.LeftDrawerContent) !== LeftDrawerContent.ModuleSettings) {
                this._guiMessageBroker.setState(GuiState.LeftDrawerContent, LeftDrawerContent.ModuleSettings);
            }
            if (this._guiMessageBroker.getState(GuiState.RightDrawerContent) === RightDrawerContent.ModulesList) {
                this._guiMessageBroker.setState(
                    GuiState.RightDrawerContent,
                    RightDrawerContent.RealizationFilterSettings,
                );
                this._guiMessageBroker.setState(GuiState.RightSettingsPanelWidthInPercent, 0);
            }

            return snapshot;
        } catch (error: any) {
            console.error("Failed to load snapshot from backend:", error);

            if (isAxiosError(error)) {
                console.error("Axios error details:", error.response?.data);
            }

            const apiError = ApiErrorHelper.fromError(error);

            const result = await ConfirmationService.confirm({
                title: "Could not load snapshot",
                message: apiError?.getMessage() ?? "Could not open snapshot",
                actions: [
                    { id: "cancel", label: "Cancel" },
                    { id: "retry", label: "Retry" },
                ],
            });

            if (result === "retry") {
                return await this.openSnapshot(snapshotId);
            }

            throw error;
        } finally {
            this._guiMessageBroker.setState(GuiState.IsLoadingSnapshot, false);
        }
    }

    /**
     * Tries to open a snapshot or session from the URL.
     * @returns True if a session or snapshot was opened, false otherwise.
     */
    async maybeOpenFromUrl(): Promise<boolean> {
        let snapshotId: string | null = null;

        // Check if a snapshot/session id is in the URL
        try {
            snapshotId = readSnapshotIdFromUrl();
        } catch (error) {
            if (error instanceof UrlError) {
                console.warn("Invalid ID in URL, ignoring URL parameters.", error);
                toast.error("Invalid snapshot ID in URL, ignoring URL parameters.");
                return false;
            }
        }

        if (snapshotId) {
            await this.openSnapshot(snapshotId);
            return true;
        }

        let sessionId: string | null = null;

        try {
            sessionId = readSessionIdFromUrl();
        } catch (error) {
            if (error instanceof UrlError) {
                console.warn("Invalid ID in URL, ignoring URL parameters.", error);
                toast.error("Invalid session ID in URL, ignoring URL parameters.");
                return false;
            }
        }

        const storedSessions = await loadAllWorkbenchSessionsFromLocalStorage();

        if (sessionId) {
            await this.openSession(sessionId);
            if (storedSessions.find((el) => el.id === sessionId)) {
                this._guiMessageBroker.setState(GuiState.ActiveSessionRecoveryDialogOpen, true);
            }
            return true;
        }

        if (storedSessions.length > 0) {
            this._guiMessageBroker.setState(GuiState.MultiSessionsRecoveryDialogOpen, true);
        }

        return false;
    }

    async openFromLocalStorage(sessionId: string | null, forceOpen = false): Promise<PrivateWorkbenchSession> {
        if (this._activeSession && !forceOpen) {
            throw new Error("A workbench session is already active. Please close it before opening a new one.");
        }

        try {
            this._guiMessageBroker.setState(GuiState.IsLoadingSession, true);

            const sessionData = await loadWorkbenchSessionFromLocalStorage(sessionId);
            if (!sessionData) {
                throw new Error("No workbench session found in local storage.");
            }

            const session = await PrivateWorkbenchSession.fromDataContainer(this._queryClient, sessionData);
            await this.setActiveSession(session);

            if (session.getIsPersisted() && sessionId) {
                const url = buildSessionUrl(sessionId);
                window.history.pushState({}, "", url);
            }

            this._guiMessageBroker.setState(GuiState.MultiSessionsRecoveryDialogOpen, false);
            this._guiMessageBroker.setState(GuiState.ActiveSessionRecoveryDialogOpen, false);

            return session;
        } catch (error) {
            console.error("Failed to load workbench session from local storage:", error);
            if (confirm("Could not load workbench session from local storage. Discard corrupted session?")) {
                this.discardLocalStorageSession(sessionId, false);
                return await this.startNewSession();
            }
            throw error;
        } finally {
            this._guiMessageBroker.setState(GuiState.IsLoadingSession, false);
        }
    }

    closeSession(): void {
        if (!this._activeSession) {
            console.warn("No active workbench session to close.");
            return;
        }

        removeSnapshotIdFromUrl();
        removeSessionIdFromUrl();
        this.unloadSession();

        this._publishSubscribeDelegate.notifySubscribers(WorkbenchSessionManagerTopic.HAS_ACTIVE_SESSION);
        this._publishSubscribeDelegate.notifySubscribers(WorkbenchSessionManagerTopic.ACTIVE_SESSION);
    }

    /**
     * Prompt user to save changes before closing current session.
     * Returns true if session was closed successfully, false if user cancelled.
     */
    async maybeCloseCurrentSession(): Promise<boolean> {
        if (!this.hasActiveSession()) {
            return true;
        }

        if (this.hasDirtyChanges()) {
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
                return false;
            }

            if (result === "save") {
                const activeSession = this.getActiveSession();
                if (!activeSession.getIsPersisted()) {
                    this._guiMessageBroker.setState(GuiState.SaveSessionDialogOpen, true);
                    return false; // Wait for user to save
                }
                await this.saveActiveSession(true);
                this.closeSession();
                return true;
            }

            if (result === "discard") {
                this.closeSession();
                return true;
            }

            throw new Error(`Unexpected confirmation result: ${result}`);
        }

        this.closeSession();
        return true;
    }

    // ========== Internal Session Management ==========

    private async setActiveSession(session: PrivateWorkbenchSession): Promise<void> {
        try {
            // Update GUI state based on session content
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

            this._activeSession = session;

            // Setup persistence for non-snapshot sessions
            if (!session.isSnapshot()) {
                this._persistenceOrchestrator = new PersistenceOrchestrator(this._workbench, session, this._notifier);
                await this._persistenceOrchestrator.start();
            }

            await this._ensembleUpdateMonitor.pollImmediately();
            this._ensembleUpdateMonitor.startPolling();

            this._publishSubscribeDelegate.notifySubscribers(WorkbenchSessionManagerTopic.HAS_ACTIVE_SESSION);
            this._publishSubscribeDelegate.notifySubscribers(WorkbenchSessionManagerTopic.ACTIVE_SESSION);
        } catch (error) {
            console.error("Failed to set active workbench session:", error);
            throw new Error("Could not load workbench session from data container.");
        } finally {
            this._guiMessageBroker.setState(GuiState.SessionHasUnsavedChanges, false);
            this._guiMessageBroker.setState(GuiState.SaveSessionDialogOpen, false);
        }
    }

    private unloadSession(): void {
        if (!this._activeSession) {
            console.warn("No active workbench session to unload.");
            return;
        }

        this._activeSession.beforeDestroy();

        if (this._persistenceOrchestrator) {
            this._persistenceOrchestrator.stop();
            this._persistenceOrchestrator = null;
        }

        this._ensembleUpdateMonitor.stopPolling();

        this._activeSession = null;
    }

    // ========== Persistence Operations ==========

    async saveActiveSession(forceSave = false): Promise<void> {
        if (!this._activeSession) {
            throw new Error("No active workbench session to save.");
        }

        if (!this._persistenceOrchestrator) {
            throw new Error("Cannot persist a snapshot.");
        }

        if (this._activeSession.getIsPersisted() || forceSave) {
            this._guiMessageBroker.setState(GuiState.IsSavingSession, true);
            const wasPersisted = this._activeSession.getIsPersisted();

            await this._persistenceOrchestrator.persistNow();

            const id = this._activeSession.getId();
            if (!wasPersisted && id) {
                const url = buildSessionUrl(id);
                window.history.pushState({}, "", url);
            }

            this._guiMessageBroker.setState(GuiState.IsSavingSession, false);
            this._guiMessageBroker.setState(GuiState.SaveSessionDialogOpen, false);
            this._guiMessageBroker.setState(GuiState.SessionHasUnsavedChanges, false);
            return;
        }

        // Session is not persisted - show save dialog
        this._guiMessageBroker.setState(GuiState.SessionHasUnsavedChanges, false);
        this._guiMessageBroker.setState(GuiState.SaveSessionDialogOpen, true);
    }

    showSaveAsDialog(): void {
        if (!this._activeSession) {
            throw new Error("No active workbench session to save.");
        }

        this._guiMessageBroker.setState(GuiState.SessionHasUnsavedChanges, false);
        this._guiMessageBroker.setState(GuiState.SaveSessionDialogOpen, true);
    }

    async createSnapshot(title: string, description: string): Promise<string | null> {
        if (!this._activeSession) {
            throw new Error("No active workbench session to create snapshot from.");
        }

        if (!this._persistenceOrchestrator) {
            throw new Error("Cannot create snapshot from a snapshot.");
        }

        this._guiMessageBroker.setState(GuiState.IsMakingSnapshot, true);

        const snapshotId = await this._persistenceOrchestrator.createSnapshot(title, description);

        this._guiMessageBroker.setState(GuiState.IsMakingSnapshot, false);

        return snapshotId;
    }

    convertSnapshotToSession(): void {
        if (!this._activeSession) {
            throw new Error("No active workbench session.");
        }

        if (!this._activeSession.isSnapshot()) {
            throw new Error("Active session is not a snapshot.");
        }

        // Update session metadata
        const description = this._activeSession.getMetadata().description;
        const now = Date.now();
        this._activeSession.setMetadata({
            title: `${truncateString(this._activeSession.getMetadata().title, MAX_TITLE_LENGTH - 11)} (snapshot)`,
            description: description ? truncateString(description, MAX_DESCRIPTION_LENGTH) : undefined,
            createdAt: now,
            updatedAt: now,
            lastModifiedMs: now,
        });
        this._activeSession.setIsSnapshot(false);
        this._activeSession.resetId();

        // Setup persistence
        this._persistenceOrchestrator = new PersistenceOrchestrator(
            this._workbench,
            this._activeSession,
            this._notifier,
        );
        this._persistenceOrchestrator.start();

        removeSnapshotIdFromUrl();
    }

    // ========== Recovery Operations ==========

    async updateFromLocalStorage(): Promise<void> {
        if (!this._activeSession) {
            throw new Error("No active session to update from local storage.");
        }

        const sessionId = this._activeSession.getId() ?? null;

        try {
            this._guiMessageBroker.setState(GuiState.IsLoadingSession, true);

            const sessionData = await loadWorkbenchSessionFromLocalStorage(sessionId);
            if (!sessionData) {
                throw new Error("No workbench session found in local storage.");
            }

            this._activeSession.setMetadata(sessionData.metadata);
            await this._activeSession.deserializeContentState(sessionData.content);

            this._guiMessageBroker.setState(GuiState.ActiveSessionRecoveryDialogOpen, false);
        } catch (error) {
            console.error("Failed to load workbench session from local storage:", error);
            if (confirm("Could not load workbench session from local storage. Discard corrupted session?")) {
                this.discardLocalStorageSession(sessionId, false);
                await this.startNewSession();
            }
        } finally {
            this._guiMessageBroker.setState(GuiState.IsLoadingSession, false);
        }
    }

    discardLocalStorageSession(sessionId: string | null, unloadSession = true): void {
        const key = localStorageKeyForSessionId(sessionId);
        localStorage.removeItem(key);

        if (!unloadSession) {
            return;
        }

        this._guiMessageBroker.setState(GuiState.SessionHasUnsavedChanges, false);
        this._guiMessageBroker.setState(GuiState.SaveSessionDialogOpen, false);

        if (this._persistenceOrchestrator) {
            this._persistenceOrchestrator.stop();
            this._persistenceOrchestrator = null;
        }

        this._activeSession = null;
        this._publishSubscribeDelegate.notifySubscribers(WorkbenchSessionManagerTopic.HAS_ACTIVE_SESSION);
        this._publishSubscribeDelegate.notifySubscribers(WorkbenchSessionManagerTopic.ACTIVE_SESSION);
    }

    // ========== Navigation Handling ==========

    /**
     * Handle browser navigation (back/forward buttons).
     * Called by NavigationObserver when user navigates with browser controls.
     * Returns true if navigation should proceed, false to cancel.
     */
    async handleNavigation(): Promise<boolean> {
        // When the user navigates with forward/backward buttons, they might want to load a snapshot/session
        const snapshotId = readSnapshotIdFromUrl();
        const sessionId = readSessionIdFromUrl();

        if (!snapshotId && !sessionId) {
            // No snapshot/session id in URL - close active session if present
            if (this.hasActiveSession()) {
                const shouldClose = await this.maybeCloseCurrentSession();
                return shouldClose; // Proceed with navigation if user confirmed
            }
            return true;
        }

        const activeSession = this.getActiveSessionOrNull();

        if (activeSession) {
            if (activeSession.isSnapshot()) {
                // Snapshots don't have unsaved changes - just load the new entity
                if (snapshotId) {
                    await this.openSnapshot(snapshotId);
                } else if (sessionId) {
                    if (activeSession.getId() === sessionId) {
                        return true; // Same session, no need to reload
                    }
                    await this.openSession(sessionId);
                }
                return true;
            }

            // Active session is not a snapshot - check for unsaved changes
            if (this.hasDirtyChanges()) {
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
                    return false;
                }

                if (result === "save") {
                    await this.saveActiveSession(true);
                    if (snapshotId) {
                        await this.openSnapshot(snapshotId);
                    } else if (sessionId) {
                        await this.openSession(sessionId);
                    }
                    return true;
                }

                if (result === "discard") {
                    this.closeSession();
                    if (snapshotId) {
                        await this.openSnapshot(snapshotId);
                    } else if (sessionId) {
                        await this.openSession(sessionId);
                    }
                    return true;
                }

                throw new Error(`Unexpected confirmation result: ${result}`);
            }
        }

        // No active session or no unsaved changes - load the requested entity
        if (snapshotId) {
            await this.openSnapshot(snapshotId);
        } else if (sessionId) {
            await this.openSession(sessionId);
        }
        return true;
    }

    // ========== Session Metadata Operations ==========

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

    // ========== Deletion Operations ==========

    async deleteSession(sessionId: string): Promise<boolean> {
        const result = await ConfirmationService.confirm({
            title: "Are you sure?",
            message:
                "This session will be deleted. This action can not be reversed. Note that any snapshots made from this session will still be available",
            actions: [
                { id: "cancel", label: "No, Cancel" },
                { id: "delete", label: "Yes, delete", color: "danger" },
            ],
        });

        if (result !== "delete") return false;

        let success = false;
        const toastId = toast.loading("Deleting session...", { autoClose: false });

        try {
            await this._queryClient
                .getMutationCache()
                .build(this._queryClient, {
                    ...deleteSessionMutation(),
                    onSuccess: () => {
                        toast.dismiss(toastId);
                        toast.success("Session successfully deleted.");
                        success = true;
                        removeSessionQueryData(this._queryClient, sessionId);
                    },
                })
                .execute({ path: { session_id: sessionId } });
        } catch (error) {
            toast.dismiss(toastId);
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
                { id: "cancel", label: "No, Cancel" },
                { id: "delete", label: "Yes, delete", color: "danger" },
            ],
        });

        if (result !== "delete") return false;

        let success = false;

        const toastId = toast.loading("Deleting snapshot...", { autoClose: false });

        try {
            await this._queryClient
                .getMutationCache()
                .build(this._queryClient, {
                    ...deleteSnapshotMutation(),
                    onSuccess: () => {
                        toast.dismiss(toastId);
                        toast.success("Snapshot successfully deleted.");
                        success = true;
                        removeSnapshotQueryData(this._queryClient);
                    },
                })
                .execute({ path: { snapshot_id: snapshotId } });
        } catch (error) {
            toast.dismiss(toastId);
            toast.error("An error occurred while deleting the snapshot.");
            console.error("Failed to delete snapshot:", error);
        }

        return success;
    }
}
