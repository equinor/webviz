import type { QueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "react-toastify";

import {
    deleteSessionMutation,
    deleteSnapshotAccessLogMutation,
    deleteSnapshotMutation,
    updateSessionMutation,
    type SessionUpdate_api,
} from "@api";
import { ConfirmationService } from "@framework/ConfirmationService";
import type { GuiMessageBroker } from "@framework/GuiMessageBroker";
import { GuiState, LeftDrawerContent, RightDrawerContent } from "@framework/GuiMessageBroker";
import type { Template } from "@framework/TemplateRegistry";
import { ApiErrorHelper } from "@framework/utils/ApiErrorHelper";
import type { Workbench } from "@framework/Workbench";
import { PublishSubscribeDelegate, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";
import { truncateString } from "@lib/utils/strings";

import { Dashboard } from "../Dashboard";
import { EnsembleUpdateMonitor } from "../EnsembleUpdateMonitor";
import { MAX_DESCRIPTION_LENGTH, MAX_TITLE_LENGTH } from "../persistence/constants";
import { PersistenceOrchestrator, PersistFailureReason } from "../persistence/core/PersistenceOrchestrator";

import { PrivateWorkbenchSession } from "./PrivateWorkbenchSession";
import { removeSessionQueryData, removeSnapshotQueryData, replaceSessionQueryData } from "./utils/crudHelpers";
import { SessionValidationError } from "./utils/deserialization";
import {
    getAllWorkbenchSessionLocalStorageKeys,
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
import type { WorkbenchSessionDataContainer } from "./utils/WorkbenchSessionDataContainer";

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
    private readonly _ensembleUpdateMonitor: EnsembleUpdateMonitor;

    private _activeSession: PrivateWorkbenchSession | null = null;
    private _persistenceOrchestrator: PersistenceOrchestrator | null = null;
    private _activeToasts: Map<string, string | number> = new Map(); // Map of operation name -> toast ID

    constructor(workbench: Workbench, queryClient: QueryClient, guiMessageBroker: GuiMessageBroker) {
        this._workbench = workbench;
        this._queryClient = queryClient;
        this._guiMessageBroker = guiMessageBroker;

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
            throw new Error("No active workbench session. This method should be called only when a session is active.");
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
        this.dismissAllToasts();
    }

    // ========== Toast Management ==========

    /**
     * Dismiss any existing toast for an operation and create a new loading toast.
     * Returns the new toast ID.
     */
    private createLoadingToast(operation: string, message: string): string | number {
        // Dismiss any existing toast for this operation
        this.dismissToast(operation);

        // Create new loading toast
        const toastId = toast.loading(message, { autoClose: false });
        this._activeToasts.set(operation, toastId);
        return toastId;
    }

    /**
     * Dismiss and remove a tracked toast for an operation.
     */
    private dismissToast(operation: string): void {
        const toastId = this._activeToasts.get(operation);
        if (toastId !== undefined) {
            toast.dismiss(toastId);
            this._activeToasts.delete(operation);
        }
    }

    /**
     * Dismiss all tracked toasts.
     */
    private dismissAllToasts(): void {
        for (const toastId of this._activeToasts.values()) {
            toast.dismiss(toastId);
        }
        this._activeToasts.clear();
    }

    // ========== Session Lifecycle ==========

    async startNewSession(): Promise<PrivateWorkbenchSession> {
        if (this._activeSession) {
            throw new Error(
                "A workbench session is already active. This should not happen and indicates a logic error.",
            );
        }

        const session = PrivateWorkbenchSession.createEmpty(this._queryClient);
        await this.setActiveSession(session);
        return session;
    }

    async openSession(sessionId: string): Promise<boolean> {
        if (this._activeSession) {
            throw new Error(
                "A workbench session is already active. This should not happen and indicates a logic error.",
            );
        }

        try {
            this._guiMessageBroker.setState(GuiState.IsLoadingSession, true);

            const url = buildSessionUrl(sessionId);
            this._workbench.getNavigationManager().pushState(url);

            const sessionData = await loadWorkbenchSessionFromBackend(this._queryClient, sessionId);
            const session = await PrivateWorkbenchSession.fromDataContainer(this._queryClient, sessionData);
            await this.setActiveSession(session);
            return true;
        } catch (error) {
            console.error("Failed to load session from backend:", error);

            let errorExplanation = "The session might not exist or you might not have access to it.";
            if (error instanceof SessionValidationError) {
                errorExplanation = "The session data is invalid, corrupted or outdated.";
            }

            if (isAxiosError(error)) {
                console.error("Axios error details:", error.response?.data);
                errorExplanation = `Server responded with message: ${error.response?.data.error.message}.`;
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
            return false;
        } finally {
            this._guiMessageBroker.setState(GuiState.IsLoadingSession, false);
        }
    }

    async openSnapshot(snapshotId: string): Promise<boolean> {
        try {
            this._guiMessageBroker.setState(GuiState.IsLoadingSnapshot, true);

            const url = buildSnapshotUrl(snapshotId);
            this._workbench.getNavigationManager().pushState(url);

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

            return true;
        } catch (error: any) {
            console.error("Failed to load snapshot from backend:", error);

            let errorExplanation = "The session might not exist or you might not have access to it.";
            if (error instanceof SessionValidationError) {
                errorExplanation = "The session data is invalid, corrupted or outdated.";
            }

            if (isAxiosError(error)) {
                console.error("Axios error details:", error.response?.data);
                errorExplanation = `Server responded with message: ${error.response?.data.error.message}.`;
            }

            const result = await ConfirmationService.confirm({
                title: "Could not load snapshot",
                message: `Could not load snapshot with ID '${snapshotId}'. ${errorExplanation}`,
                actions: [
                    { id: "cancel", label: "Cancel" },
                    { id: "retry", label: "Retry" },
                ],
            });

            if (result === "retry") {
                return await this.openSnapshot(snapshotId);
            }
            return false;
        } finally {
            this._guiMessageBroker.setState(GuiState.IsLoadingSnapshot, false);
        }
    }

    async openFromLocalStorage(sessionId: string | null, forceOpen = false): Promise<boolean> {
        if (this._activeSession && !forceOpen) {
            throw new Error(
                "A workbench session is already active. This should not happen and indicates a logic error.",
            );
        }

        try {
            this._guiMessageBroker.setState(GuiState.IsLoadingSession, true);

            const localStorageSessionData = loadWorkbenchSessionFromLocalStorage(sessionId);
            if (!localStorageSessionData) {
                throw new Error(
                    "No workbench session found in local storage. This should not happen and indicates a logic error.",
                );
            }

            // If the session has been persisted before, we want to first load from backend to get the latest version
            // and then apply local storage changes on top of it
            if (sessionId && localStorageSessionData.id) {
                const backendSessionData = await loadWorkbenchSessionFromBackend(this._queryClient, sessionId);
                const session = await PrivateWorkbenchSession.fromDataContainer(this._queryClient, backendSessionData);
                await this.setActiveSession(session);

                if (!this._activeSession) {
                    throw new Error(
                        "Failed to set active session from backend data. This should not happen and indicates a logic error.",
                    );
                }

                // Apply local storage changes on top
                this._activeSession.setMetadata(localStorageSessionData.metadata);
                await this._activeSession.deserializeContentState(localStorageSessionData.content);

                const url = buildSessionUrl(sessionId);
                this._workbench.getNavigationManager().pushState(url);
            } else {
                const session = await PrivateWorkbenchSession.fromDataContainer(
                    this._queryClient,
                    localStorageSessionData,
                );
                await this.setActiveSession(session);
            }

            this._guiMessageBroker.setState(GuiState.MultiSessionsRecoveryDialogOpen, false);
            this._guiMessageBroker.setState(GuiState.ActiveSessionRecoveryDialogOpen, false);

            return true;
        } catch (error) {
            console.error("Failed to load workbench session from local storage:", error);

            let errorExplanation = "";
            if (error instanceof SessionValidationError) {
                errorExplanation = "The session data is invalid, corrupted or outdated.";
            }

            // We can have different cases here:
            // 1) The user opened a session that has not been persisted yet - we can offer to discard it and start fresh
            // 2) The user opened a session that has been persisted but and has a local storage version - we can offer to discard local storage version and load from backend

            let additionalMessage = "and start fresh?";
            if (sessionId) {
                additionalMessage = "and load the persisted session from the server?";
            }

            const result = await ConfirmationService.confirm({
                title: "Could not load session from local storage",
                message: `Could not load session from local storage. ${errorExplanation} Do you want to discard the possibly corrupted local storage session ${additionalMessage}`,
                actions: [
                    { id: "retry", label: "Retry" },
                    { id: "cancel", label: "No, cancel" },
                    { id: "discard", label: "Yes, discard", color: "danger" },
                ],
            });

            if (result === "discard") {
                this.discardLocalStorageSession(sessionId, false);
                if (!sessionId) {
                    await this.startNewSession();
                } else {
                    await this.openSession(sessionId);
                }
                this._guiMessageBroker.setState(GuiState.ActiveSessionRecoveryDialogOpen, false);
                this._guiMessageBroker.setState(GuiState.MultiSessionsRecoveryDialogOpen, false);
            }
            if (result === "retry") {
                return await this.openFromLocalStorage(sessionId, forceOpen);
            }

            // We do not have to handle "cancel" explicitly here
            return false;
        } finally {
            this._guiMessageBroker.setState(GuiState.IsLoadingSession, false);
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
            throw error;
        }

        if (snapshotId) {
            return await this.openSnapshot(snapshotId);
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
            throw error;
        }

        let storedSessions: WorkbenchSessionDataContainer[] = [];

        // Local storage session loading/validating can fail silently for the user
        try {
            storedSessions = loadAllWorkbenchSessionsFromLocalStorage();
        } catch (error) {
            console.error("Failed to load sessions from local storage:", error);
        }

        if (sessionId) {
            const result = await this.openSession(sessionId);
            if (storedSessions.find((el) => el.id === sessionId)) {
                this._guiMessageBroker.setState(GuiState.ActiveSessionRecoveryDialogOpen, true);
            }
            return result;
        }

        // No session/snapshot id in URL - check for localStorage sessions for recovery
        if (storedSessions.length > 0) {
            this._guiMessageBroker.setState(GuiState.MultiSessionsRecoveryDialogOpen, true);
        }

        return false;
    }

    async refreshActiveSessionFromBackend(): Promise<boolean> {
        if (!this._activeSession) {
            throw new Error(
                "No active workbench session to refresh. This should not happen and indicates a logic error.",
            );
        }

        const sessionId = this._activeSession.getId();
        if (!sessionId) {
            throw new Error(
                "Active workbench session is not persisted, cannot refresh from backend. This should not happen and indicates a logic error.",
            );
        }

        this.unloadSession();
        return await this.openSession(sessionId);
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
                this._persistenceOrchestrator = new PersistenceOrchestrator(this._workbench, session);
                await this._persistenceOrchestrator.start();
            }

            await this._ensembleUpdateMonitor.pollImmediately();
            this._ensembleUpdateMonitor.startPolling();

            this._publishSubscribeDelegate.notifySubscribers(WorkbenchSessionManagerTopic.HAS_ACTIVE_SESSION);
            this._publishSubscribeDelegate.notifySubscribers(WorkbenchSessionManagerTopic.ACTIVE_SESSION);
        } catch (error) {
            console.error("Failed to set active workbench session:", error);
            throw new Error(
                "Could not load workbench session from data container. This should not happen and indicates a logic error.",
            );
        } finally {
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

    async saveActiveSession(forceSave = false): Promise<boolean> {
        if (!this._activeSession) {
            throw new Error("No active workbench session to save. This should not happen and indicates a logic error.");
        }

        if (!this._persistenceOrchestrator) {
            throw new Error("Cannot persist a snapshot. This should not happen and indicates a logic error.");
        }

        if (this._activeSession.getIsPersisted() || forceSave) {
            this._guiMessageBroker.setState(GuiState.IsSavingSession, true);
            const wasPersisted = this._activeSession.getIsPersisted();

            this.createLoadingToast("saveSession", "Saving session...");

            const result = await this._persistenceOrchestrator.persistNow();

            this.dismissToast("saveSession");

            if (result.success) {
                toast.success("Session saved successfully");

                const id = this._activeSession.getId();
                if (!wasPersisted && id) {
                    const url = buildSessionUrl(id);
                    this._workbench.getNavigationManager().pushState(url);
                }
            } else {
                if (result.reason === PersistFailureReason.ERROR) {
                    toast.error("Failed to save session");
                } else if (result.reason === PersistFailureReason.SAVE_IN_PROGRESS) {
                    toast.error("Save already in progress. Please wait...");
                } else if (result.reason === PersistFailureReason.NO_CHANGES) {
                    toast.info("No changes to save");
                } else if (result.reason === PersistFailureReason.CONTENT_TOO_LARGE) {
                    toast.error(result.message);
                }
            }

            this._guiMessageBroker.setState(GuiState.IsSavingSession, false);
            this._guiMessageBroker.setState(GuiState.SaveSessionDialogOpen, false);
            return result.success;
        }

        // Session is not persisted - show save dialog
        this._guiMessageBroker.setState(GuiState.SaveSessionDialogOpen, true);
        return false;
    }

    async saveAsNewSession(title: string, description?: string): Promise<void> {
        if (!this._activeSession) {
            throw new Error("No active workbench session to save. This should not happen and indicates a logic error.");
        }

        if (!this._persistenceOrchestrator) {
            throw new Error("Cannot persist a snapshot. This should not happen and indicates a logic error.");
        }

        this._guiMessageBroker.setState(GuiState.IsSavingSession, true);

        try {
            // Create a copy of the current session
            const newSession = await PrivateWorkbenchSession.createCopy(this._queryClient, this._activeSession);

            // Update metadata with new title and description BEFORE setting as active
            // This prevents the session from being marked dirty
            newSession.updateMetadata({ title, description }, false);

            // Close current session
            this.unloadSession();

            // Set new session as active
            await this.setActiveSession(newSession);

            this.createLoadingToast("saveAsNewSession", "Saving session as new...");

            // Persist the new session
            const result = await this._persistenceOrchestrator.persistNow();

            this.dismissToast("saveAsNewSession");

            if (result.success) {
                toast.success("Session saved successfully");

                // Update URL with new session ID
                const id = newSession.getId();
                if (id) {
                    const url = buildSessionUrl(id);
                    this._workbench.getNavigationManager().pushState(url);
                }
            } else {
                if (result.reason === PersistFailureReason.ERROR) {
                    toast.error("Failed to save session");
                } else if (result.reason === PersistFailureReason.SAVE_IN_PROGRESS) {
                    toast.error("Save already in progress. Please wait...");
                } else if (result.reason === PersistFailureReason.NO_CHANGES) {
                    toast.info("No changes to save");
                } else if (result.reason === PersistFailureReason.CONTENT_TOO_LARGE) {
                    toast.error(result.message);
                }
            }

            this._guiMessageBroker.setState(GuiState.SaveSessionDialogOpen, false);
        } catch (error) {
            console.error("Failed to save session as new:", error);
            toast.error("Failed to save session as new");
            throw error;
        } finally {
            this._guiMessageBroker.setState(GuiState.IsSavingSession, false);
        }
    }

    async createSnapshot(title: string, description: string): Promise<string | null> {
        if (!this._activeSession) {
            throw new Error(
                "No active workbench session to create snapshot from. This should not happen and indicates a logic error.",
            );
        }

        if (!this._persistenceOrchestrator) {
            throw new Error(
                "Cannot create snapshot from a snapshot. This should not happen and indicates a logic error.",
            );
        }

        this.createLoadingToast("createSnapshot", "Creating snapshot...");

        this._guiMessageBroker.setState(GuiState.IsMakingSnapshot, true);

        const result = await this._persistenceOrchestrator.createSnapshot(title, description);

        this.dismissToast("createSnapshot");

        if (result.success) {
            toast.success("Snapshot created successfully");
        } else {
            toast.error(result.message ? `Failed to create snapshot: ${result.message}` : "Failed to create snapshot");
        }

        this._guiMessageBroker.setState(GuiState.IsMakingSnapshot, false);

        return result.success ? result.snapshotId : null;
    }

    convertSnapshotToSession(): void {
        if (!this._activeSession) {
            throw new Error("No active workbench session. This should not happen and indicates a logic error.");
        }

        if (!this._activeSession.isSnapshot()) {
            throw new Error("Active session is not a snapshot. This should not happen and indicates a logic error.");
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
        this._persistenceOrchestrator = new PersistenceOrchestrator(this._workbench, this._activeSession);
        this._persistenceOrchestrator.start();

        removeSnapshotIdFromUrl();
    }

    // ========== Template Operations ==========

    async applyTemplate(template: Template): Promise<boolean> {
        if (!this.hasActiveSession()) {
            await this.startNewSession();
        } else {
            const activeSession = this.getActiveSession();
            const confirmationRequired =
                activeSession.getDashboards().length > 0 &&
                activeSession.getActiveDashboard().getModuleInstances().length > 0;

            if (confirmationRequired) {
                const result = await ConfirmationService.confirm({
                    title: "Replace current dashboard with template?",
                    message:
                        "By applying this template, your current dashboard will be replaced and loose its state. Do you want to proceed?",
                    actions: [
                        { id: "cancel", label: "No, cancel" },
                        { id: "delete", label: "Yes, proceed", color: "danger" },
                    ],
                });

                if (result === "cancel") {
                    return false;
                }
            }
        }

        const activeSession = this.getActiveSession();
        const dashboard = await Dashboard.fromTemplate(template, activeSession.getAtomStoreMaster());
        activeSession.setDashboards([dashboard]);
        return true;
    }

    // ========== Recovery Operations ==========

    async updateFromLocalStorage(): Promise<void> {
        if (!this._activeSession) {
            throw new Error(
                "No active session to update from local storage. This should not happen and indicates a logic error.",
            );
        }

        const sessionId = this._activeSession.getId() ?? null;

        try {
            this._guiMessageBroker.setState(GuiState.IsLoadingSession, true);

            const sessionData = loadWorkbenchSessionFromLocalStorage(sessionId);
            if (!sessionData) {
                throw new Error(
                    "No workbench session found in local storage. This should not happen and indicates a logic error.",
                );
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

        this._guiMessageBroker.setState(GuiState.SaveSessionDialogOpen, false);

        if (this._persistenceOrchestrator) {
            this._persistenceOrchestrator.stop();
            this._persistenceOrchestrator = null;
        }

        this._activeSession = null;
        this._publishSubscribeDelegate.notifySubscribers(WorkbenchSessionManagerTopic.HAS_ACTIVE_SESSION);
        this._publishSubscribeDelegate.notifySubscribers(WorkbenchSessionManagerTopic.ACTIVE_SESSION);
    }

    discardAllLocalStorageSessions(): void {
        const keys = getAllWorkbenchSessionLocalStorageKeys();
        for (const key of keys) {
            localStorage.removeItem(key);
        }
    }

    // ========== Navigation Handling ==========

    /**
     * Handle browser navigation (back/forward buttons).
     * Called by NavigationManager when user navigates with browser controls.
     * Returns true if navigation should proceed, false to cancel.
     */
    async handleNavigation(): Promise<boolean> {
        // When the user navigates with forward/backward buttons, they might want to load a snapshot/session
        const snapshotId = readSnapshotIdFromUrl();
        const sessionId = readSessionIdFromUrl();

        const result = await this.maybeCloseCurrentSession();
        if (!result) {
            return false; // User cancelled navigation
        }

        // No active session or no unsaved changes - load the requested entity
        if (snapshotId) {
            const result = await this.openSnapshot(snapshotId);
            if (!result) {
                removeSnapshotIdFromUrl();
            }
        } else if (sessionId) {
            const result = await this.openSession(sessionId);
            if (!result) {
                removeSessionIdFromUrl();
            }
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
                { id: "cancel", label: "No, cancel" },
                { id: "delete", label: "Yes, delete", color: "danger" },
            ],
        });

        if (result !== "delete") return false;

        let success = false;
        this.createLoadingToast("deleteSession", "Deleting session...");

        try {
            await this._queryClient
                .getMutationCache()
                .build(this._queryClient, {
                    ...deleteSessionMutation(),
                    onSuccess: () => {
                        this.dismissToast("deleteSession");
                        toast.success("Session successfully deleted.");
                        success = true;
                        removeSessionQueryData(this._queryClient, sessionId);
                    },
                })
                .execute({ path: { session_id: sessionId } });
        } catch (error) {
            this.dismissToast("deleteSession");
            toast.error("An error occurred while deleting the session.");
            console.error("Failed to delete session:", error);
        }

        return success;
    }

    async deleteSnapshot(snapshotId: string): Promise<boolean> {
        const result = await ConfirmationService.confirm({
            title: "Are you sure?",
            message:
                "This snapshot will be deleted and will no longer be available to any user. This action cannot be reversed.",
            actions: [
                { id: "cancel", label: "No, cancel" },
                { id: "delete", label: "Yes, delete", color: "danger" },
            ],
        });

        if (result !== "delete") return false;

        let success = false;
        this.createLoadingToast("deleteSnapshot", "Deleting snapshot...");

        try {
            await this._queryClient
                .getMutationCache()
                .build(this._queryClient, {
                    ...deleteSnapshotMutation(),
                    onSuccess: () => {
                        this.dismissToast("deleteSnapshot");
                        toast.success("Snapshot successfully deleted.");
                        success = true;
                        removeSnapshotQueryData(this._queryClient);
                    },
                })
                .execute({ path: { snapshot_id: snapshotId } });
        } catch (error) {
            this.dismissToast("deleteSnapshot");
            toast.error("An error occurred while deleting the snapshot.");
            console.error("Failed to delete snapshot:", error);
        }

        return success;
    }

    async deleteSnapshotAccessLog(snapshotId: string): Promise<boolean> {
        const result = await ConfirmationService.confirm({
            title: "Are you sure?",
            message:
                "The snapshot will be removed from your list of visited snapshots. If it hasn't been deleted, you can open the snapshot again using its ID.",
            actions: [
                { id: "cancel", label: "No, cancel" },
                { id: "delete", label: "Yes, remove", color: "danger" },
            ],
        });

        if (result !== "delete") return false;

        let success = false;
        this.createLoadingToast("deleteSnapshotAccessLog", "Deleting snapshot access log...");

        try {
            await this._queryClient
                .getMutationCache()
                .build(this._queryClient, {
                    ...deleteSnapshotAccessLogMutation(),
                    onSuccess: () => {
                        this.dismissToast("deleteSnapshotAccessLog");
                        toast.success("Snapshot successfully removed from list.");
                        success = true;
                        removeSnapshotQueryData(this._queryClient);
                    },
                })
                .execute({ path: { snapshot_id: snapshotId } });
        } catch (error) {
            this.dismissToast("deleteSnapshotAccessLog");
            toast.error("An error occurred while removing the snapshot from the list.");
            console.error("Failed to delete snapshot access log:", error);
        }

        return success;
    }
}
