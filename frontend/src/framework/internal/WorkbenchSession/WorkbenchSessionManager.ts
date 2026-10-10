import type { QueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";

import {
    deleteSessionMutation,
    deleteSnapshotAccessLogMutation,
    deleteSnapshotMutation,
    updateSessionMutation,
    type SessionUpdate_api,
} from "@api";
import { ConfirmationService } from "@framework/ConfirmationService";
import { EnsembleFingerprintStore } from "@framework/EnsembleFingerprintStore";
import type { GuiMessageBroker } from "@framework/GuiMessageBroker";
import { GuiEvent, GuiState, RightDrawerContent } from "@framework/GuiMessageBroker";
import type { Template } from "@framework/TemplateRegistry";
import { toastManager } from "@framework/toastManager";
import { ApiErrorHelper } from "@framework/utils/ApiErrorHelper";
import type { Workbench } from "@framework/Workbench";
import { PublishSubscribeDelegate, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";
import { truncateString } from "@lib/utils/strings";
import { UnsubscribeFunctionsManagerDelegate } from "@lib/utils/UnsubscribeFunctionsManagerDelegate";

import { Dashboard } from "../Dashboard";
import { EnsembleUpdateMonitor } from "../EnsembleUpdateMonitor";
import { MAX_DESCRIPTION_LENGTH, MAX_TITLE_LENGTH } from "../persistence/constants";
import { PersistenceOrchestrator } from "../persistence/core/PersistenceOrchestrator";
import {
    PersistFailureReason,
    persistSessionToBackend,
    type PersistResult,
} from "../persistence/core/persistSessionToBackend";

import { PrivateWorkbenchSession, PrivateWorkbenchSessionTopic } from "./PrivateWorkbenchSession";
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
import { buildWorkbenchUrl, readWorkbenchUrlLocation, UrlError, type WorkbenchUrlLocation } from "./utils/url";
import type { WorkbenchSessionDataContainer } from "./utils/WorkbenchSessionDataContainer";

const SETTINGS_PANEL_DEFAULT_VISIBLE_WIDTH_PERCENT = 15;

export enum SessionPersistenceAction {
    SAVE = "save",
    LOAD = "load",
    LOCAL_LOAD = "local_load",
    CREATE_SNAPSHOT = "create_snapshot",
    OPEN_SNAPSHOT = "open_snapshot",
}

export class SessionPersistenceError extends Error {
    name = "SessionPersistenceError";
}

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
    private _unsubscribeFunctionsManagerDelegate: UnsubscribeFunctionsManagerDelegate =
        new UnsubscribeFunctionsManagerDelegate();
    private _activeToasts: Map<string, string> = new Map(); // Map of operation name -> toast ID

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

    private createToast(message: string, type: "success" | "error" | "default" = "default"): string {
        return toastManager.add({ title: message, type });
    }

    /**
     * Dismiss any existing toast for an operation and create a new loading toast.
     * Returns the new toast ID.
     */
    private createLoadingToast(operation: string, message: string): string {
        this.dismissToast(operation);
        const toastId = toastManager.add({ title: message, type: "loading", timeout: 0 });
        this._activeToasts.set(operation, toastId);
        return toastId;
    }

    /**
     * Dismiss and remove a tracked toast for an operation.
     */
    private dismissToast(operation: string): void {
        const toastId = this._activeToasts.get(operation);
        if (toastId !== undefined) {
            toastManager.close(toastId);
            this._activeToasts.delete(operation);
        }
    }

    /**
     * Dismiss all tracked toasts.
     */
    private dismissAllToasts(): void {
        for (const toastId of this._activeToasts.values()) {
            toastManager.close(toastId);
        }
        this._activeToasts.clear();
    }

    /**
     * Set GUI state with possible ensemble loading errors for active session when opening sessions/snapshots.
     *
     * Sets the EnsemblesLoadingErrorInfoMap and opens the dialog if there are errors.
     */
    private applyActiveSessionEnsembleLoadErrorsToGuiState(): void {
        if (!this._activeSession) {
            throw new Error("No active session to check for ensemble loading errors.");
        }

        // Pass the session loading errors to GUI state
        this._guiMessageBroker.setState(
            GuiState.EnsemblesLoadingErrorInfoMap,
            this._activeSession.getEnsembleLoadingErrorInfoMap(),
        );

        // Open info dialog if there were loading errors
        if (Object.keys(this._activeSession.getEnsembleLoadingErrorInfoMap()).length > 0) {
            this._guiMessageBroker.setState(GuiState.EnsembleLoadingErrorInfoDialogOpen, true);
        }

        // Pass the session loading warnings to GUI state
        this._guiMessageBroker.setState(
            GuiState.EnsemblesLoadingWarningInfoMap,
            this._activeSession.getEnsembleLoadingWarningInfoMap(),
        );

        // Open warning dialog if there were non-fatal loading warnings
        if (Object.keys(this._activeSession.getEnsembleLoadingWarningInfoMap()).length > 0) {
            this._guiMessageBroker.setState(GuiState.EnsembleLoadingWarningInfoDialogOpen, true);
        }
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

    // dashboardId (e.g. from a deep link) is activated directly, instead of first loading the persisted
    // active dashboard only to switch away from it
    async openSession(sessionId: string, dashboardId: string | null = null): Promise<boolean> {
        if (this._activeSession) {
            throw new Error(
                "A workbench session is already active. This should not happen and indicates a logic error.",
            );
        }

        try {
            this._guiMessageBroker.setState(GuiState.IsLoadingSession, true);

            const url = buildWorkbenchUrl({ kind: "session", sessionId, dashboardId });
            this._workbench.getNavigationManager().pushState(url);

            const sessionData = await loadWorkbenchSessionFromBackend(this._queryClient, sessionId);
            const session = await PrivateWorkbenchSession.fromDataContainer(
                this._queryClient,
                sessionData,
                dashboardId,
            );

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

            // Return to start and register error
            this._workbench.getNavigationManager().pushState("/");
            this._guiMessageBroker.publishEvent(GuiEvent.SessionPersistenceError, {
                action: SessionPersistenceAction.LOAD,
                error: new SessionPersistenceError(
                    `Could not load session with ID '${sessionId}'. ${errorExplanation}`,
                ),
                retry: () => this.openSession(sessionId, dashboardId),
            });

            return false;
        } finally {
            this._guiMessageBroker.setState(GuiState.IsLoadingSession, false);
        }
    }

    async openSnapshot(snapshotId: string, dashboardId: string | null = null): Promise<boolean> {
        try {
            this._guiMessageBroker.setState(GuiState.IsLoadingSnapshot, true);

            const url = buildWorkbenchUrl({ kind: "snapshot", snapshotId, dashboardId });
            this._workbench.getNavigationManager().pushState(url);

            const snapshotData = await loadSnapshotFromBackend(this._queryClient, snapshotId);
            const snapshot = await PrivateWorkbenchSession.fromDataContainer(
                this._queryClient,
                snapshotData,
                dashboardId,
            );

            await this.setActiveSession(snapshot);

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

            let errorExplanation = "The snapshot might not exist or you might not have access to it.";
            if (error instanceof SessionValidationError) {
                errorExplanation = "The snapshot data is invalid, corrupted or outdated.";
            }

            if (isAxiosError(error)) {
                console.error("Axios error details:", error.response?.data);
                errorExplanation = `Server responded with message: ${error.response?.data.error.message}.`;
            }

            // Return to start and register error
            this._workbench.getNavigationManager().pushState("/");
            this._guiMessageBroker.publishEvent(GuiEvent.SessionPersistenceError, {
                action: SessionPersistenceAction.OPEN_SNAPSHOT,
                error: new SessionPersistenceError(
                    `Could not load snapshot with ID '${snapshotId}'. ${errorExplanation}`,
                ),
                retry: () => this.openSnapshot(snapshotId, dashboardId),
            });

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

                // Update GUI states based on possible loading errors
                this.applyActiveSessionEnsembleLoadErrorsToGuiState();

                const dashboardId = this._activeSession.getActiveDashboard()?.getId() ?? null;
                const url = buildWorkbenchUrl({ kind: "session", sessionId, dashboardId });
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
                variant: "error",
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
        // Read once, atomically - openSession/openSnapshot below rewrite the URL's whole path, so a
        // second read afterward could see a URL that no longer has a dashboard segment.
        let location;
        try {
            location = readWorkbenchUrlLocation();
        } catch (error) {
            if (error instanceof UrlError) {
                console.warn("Invalid ID in URL, ignoring URL parameters.", error);
                this.createToast("Invalid ID in URL, ignoring URL parameters.", "error");
                return false;
            }
            throw error;
        }

        if (location.kind === "snapshot") {
            return await this.openSnapshot(location.snapshotId, location.dashboardId);
        }

        let storedSessions: WorkbenchSessionDataContainer[] = [];

        // Local storage session loading/validating can fail silently for the user
        try {
            storedSessions = loadAllWorkbenchSessionsFromLocalStorage();
        } catch (error) {
            console.error("Failed to load sessions from local storage:", error);
        }

        if (location.kind === "session") {
            const result = await this.openSession(location.sessionId, location.dashboardId);
            if (storedSessions.find((el) => el.id === location.sessionId)) {
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

        this._workbench.getNavigationManager().pushState(buildWorkbenchUrl({ kind: "root" }));
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
                title: "Save changes before closing session?",
                message: "You have unsaved changes in your current session. Do you want to save them before closing?",
                actions: [
                    { id: "cancel", label: "Cancel", color: "secondary" },
                    { id: "discard", label: "Don't save", color: "danger" },
                    { id: "save", label: "Save", color: "primary" },
                ],
            });

            if (result === "cancel") {
                return false;
            }

            if (result === "save") {
                const saveSuccess = await this.maybeSaveSession();

                if (saveSuccess) this.closeSession();

                return saveSuccess;
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

            const activeDashboard = session.getActiveDashboard();
            if (activeDashboard && activeDashboard.getLayout().length === 0) {
                this._guiMessageBroker.setState(GuiState.RightDrawerContent, RightDrawerContent.ModulesList);
                if (this._guiMessageBroker.getState(GuiState.RightSettingsPanelWidthInPercent) === 0) {
                    this._guiMessageBroker.setState(
                        GuiState.RightSettingsPanelWidthInPercent,
                        SETTINGS_PANEL_DEFAULT_VISIBLE_WIDTH_PERCENT,
                    );
                }
            }

            this._activeSession = session;

            // Keep the dashboard segment of the URL in sync with whichever dashboard is active,
            // for the lifetime of this session (covers tab clicks, addDashboard, removeDashboard -
            // anything that publishes ACTIVE_DASHBOARD - without each call site needing to know about URLs).
            this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
                "activeDashboardUrl",
                session
                    .getPublishSubscribeDelegate()
                    .makeSubscriberFunction(PrivateWorkbenchSessionTopic.ACTIVE_DASHBOARD)(
                    this.updateActiveDashboardUrl.bind(this),
                ),
            );
            this.updateActiveDashboardUrl();

            // Setup persistence for non-snapshot sessions
            if (!session.isSnapshot()) {
                this._persistenceOrchestrator = new PersistenceOrchestrator(this._workbench, session);
                await this._persistenceOrchestrator.start();
            }

            await this._ensembleUpdateMonitor.pollImmediately();
            this._ensembleUpdateMonitor.startPolling();

            // Update GUI states based on possible loading errors
            this.applyActiveSessionEnsembleLoadErrorsToGuiState();

            this._publishSubscribeDelegate.notifySubscribers(WorkbenchSessionManagerTopic.HAS_ACTIVE_SESSION);
            this._publishSubscribeDelegate.notifySubscribers(WorkbenchSessionManagerTopic.ACTIVE_SESSION);
        } catch (error) {
            console.error("Failed to set active workbench session:", error);
            throw new Error(
                "Could not load workbench session from data container. This should not happen and indicates a logic error.",
                { cause: error },
            );
        }
    }

    private unloadSession(): void {
        if (!this._activeSession) {
            console.warn("No active workbench session to unload.");
            return;
        }

        this._activeSession.beforeDestroy();
        // Global, so only cleared along with the active session - not when destroying e.g. a save-as copy
        EnsembleFingerprintStore.clear();

        if (this._persistenceOrchestrator) {
            this._persistenceOrchestrator.stop();
            this._persistenceOrchestrator = null;
        }

        this._unsubscribeFunctionsManagerDelegate.unsubscribe("activeDashboardUrl");

        this._ensembleUpdateMonitor.stopPolling();

        this._activeSession = null;

        this.resetGuiStates();
    }

    private updateActiveDashboardUrl(): void {
        if (!this._activeSession?.getIsPersisted()) {
            return;
        }
        const currentLocation = readWorkbenchUrlLocation();
        if (currentLocation.kind === "root") {
            return;
        }
        const dashboardId = this._activeSession.getActiveDashboard()?.getId() ?? null;
        if (currentLocation.dashboardId === dashboardId) {
            // Already in sync, e.g. after back/forward navigation
            return;
        }

        const url = buildWorkbenchUrl({ ...currentLocation, dashboardId });

        // Only switching between existing dashboards gets a history entry - on session open or after
        // removing the active dashboard, the current entry is corrected instead
        const previousDashboardStillExists =
            currentLocation.dashboardId !== null &&
            this._activeSession.getDashboards().some((d) => d.getId() === currentLocation.dashboardId);

        if (previousDashboardStillExists) {
            this._workbench.getNavigationManager().pushState(url);
        } else {
            this._workbench.getNavigationManager().replaceState(url);
        }
    }

    private switchDashboardFromUrl(dashboardId: string | null): void {
        const session = this.getActiveSession();
        const activeDashboardId = session.getActiveDashboard()?.getId() ?? null;

        if (dashboardId !== null && dashboardId === activeDashboardId) {
            // Already shown, e.g. a duplicate entry left by removing the active dashboard - move on, so
            // the step doesn't look like it did nothing. Otherwise the URL already matches.
            this._workbench.getNavigationManager().skipEntry();
            return;
        }

        const dashboardExists = dashboardId !== null && session.getDashboards().some((d) => d.getId() === dashboardId);

        if (dashboardExists) {
            try {
                session.setActiveDashboard(dashboardId);
                return;
            } catch (error) {
                console.error(`Failed to switch to dashboard "${dashboardId}":`, error);
                this.createToast("Failed to switch dashboard", "error");
            }
        } else if (dashboardId !== null && this._workbench.getNavigationManager().skipEntry()) {
            // Dashboard no longer exists, e.g. deleted - move on to the next entry
            return;
        }

        // Dashboard failed to load or can't be skipped - stay on the current one and fix up the URL
        const currentLocation = readWorkbenchUrlLocation();
        if (currentLocation.kind === "root") {
            return;
        }
        this._workbench
            .getNavigationManager()
            .replaceState(buildWorkbenchUrl({ ...currentLocation, dashboardId: activeDashboardId }));
    }

    private isActiveSessionLocation(location: WorkbenchUrlLocation): boolean {
        const session = this._activeSession;
        if (!session?.getIsPersisted() || location.kind === "root") {
            return false;
        }
        const locationId = location.kind === "session" ? location.sessionId : location.snapshotId;
        return session.isSnapshot() === (location.kind === "snapshot") && session.getId() === locationId;
    }

    private resetGuiStates(): void {
        this._guiMessageBroker.setState(GuiState.NumberOfEffectiveRealizationFilters, 0);
        this._guiMessageBroker.setState(GuiState.NumberOfUnsavedRealizationFilters, 0);
    }

    // ========== Persistence Operations ==========
    async maybeSaveSession(opts?: { saveAsNew?: boolean }) {
        if (this._activeSession?.getIsPersisted()) return this.saveSession(opts);

        // The session has never been persisted before: open the metadata dialog to prompt the user to give the session a proper title
        this._guiMessageBroker.setState(GuiState.SaveSessionDialogOpen, true);
        return false;
    }

    /**
     * @param opts.metadata Title/description to save with - with saveAsNew, applied to the new session
     * only, so the current session is unaffected if saving fails.
     */
    async saveSession(opts?: {
        saveAsNew?: boolean;
        metadata?: { title: string; description?: string };
    }): Promise<boolean> {
        if (!this._activeSession) {
            throw new Error("No active workbench session to save. This should not happen and indicates a logic error.");
        }

        if (!this._persistenceOrchestrator) {
            throw new Error("Cannot persist a snapshot. This should not happen and indicates a logic error.");
        }

        const progressToastId = "saveSession";
        // Captured as a value: a session's first save assigns the id to this same session object
        const initialSessionId = this._activeSession.getId();

        this._guiMessageBroker.setState(GuiState.IsSavingSession, true);

        try {
            let result: PersistResult;

            if (opts?.saveAsNew) {
                this.createLoadingToast(progressToastId, "Saving new session...");
                result = await this.persistCopyAsNewSession(opts.metadata);
            } else {
                this.createLoadingToast(progressToastId, "Saving session...");
                if (opts?.metadata) {
                    this._activeSession.updateMetadata(opts.metadata);
                }
                result = await this._persistenceOrchestrator.persistNow();
            }
            this.dismissToast(progressToastId);

            if (result.success) {
                this.createToast("Session saved successfully", "success");

                // Update URL if session id changed. This happens on save-as, and on a session's first save -
                // unless the user moved on to another session while saving
                const activeSession = this._activeSession;
                const newId = result.sessionId;
                if (activeSession?.getId() === newId && newId !== initialSessionId) {
                    const dashboardId = activeSession.getActiveDashboard()?.getId() ?? null;
                    const url = buildWorkbenchUrl({ kind: "session", sessionId: newId, dashboardId });
                    this._workbench.getNavigationManager().pushState(url);
                }

                return true;
            } else {
                if (result.reason === PersistFailureReason.SAVE_IN_PROGRESS) {
                    throw new SessionPersistenceError("Save already in progress. Please wait...");
                } else if (result.reason === PersistFailureReason.NO_CHANGES) {
                    // Not an error — silently succeed when there's nothing to persist
                    return true;
                } else if (result.reason === PersistFailureReason.CONTENT_TOO_LARGE) {
                    throw new SessionPersistenceError(result.message);
                } else {
                    throw new SessionPersistenceError("Unexpected error");
                }
            }
        } catch (err) {
            const error = err as Error;
            this.dismissToast(progressToastId);
            console.error("Failed to save session:", error);

            this._guiMessageBroker.publishEvent(GuiEvent.SessionPersistenceError, {
                action: SessionPersistenceAction.SAVE,
                error,
                retry: () => this.saveSession(opts),
            });

            return false;
        } finally {
            this._guiMessageBroker.setState(GuiState.IsSavingSession, false);
        }
    }

    /**
     * Saves a copy of the active session as a new session, and only replaces the active session with
     * the copy once that succeeded - on failure, the active session is left untouched.
     */
    private async persistCopyAsNewSession(metadata?: { title: string; description?: string }): Promise<PersistResult> {
        const sourceSession = this.getActiveSession();
        const copy = await PrivateWorkbenchSession.createCopy(this._queryClient, sourceSession);
        if (metadata) {
            copy.updateMetadata(metadata);
        }

        const result = await persistSessionToBackend(this._workbench, copy);
        // Not activated if the user moved on to another session in the meantime - it's saved, though
        if (!result.success || this._activeSession !== sourceSession) {
            copy.beforeDestroy();
            return result;
        }

        this.unloadSession();
        await this.setActiveSession(copy);
        return result;
    }

    /**
     * @param activeDashboardId Dashboard the snapshot opens on, instead of this session's active
     * dashboard - lets the user pick one without switching dashboards in the live session.
     */
    async createSnapshot(title: string, description: string, activeDashboardId?: string): Promise<string | null> {
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

        const contentOverride =
            activeDashboardId !== undefined ? this._activeSession.serializeContentState(activeDashboardId) : undefined;
        const result = await this._persistenceOrchestrator.createSnapshot(title, description, contentOverride);

        this.dismissToast("createSnapshot");

        if (result.success) {
            this.createToast("Snapshot created successfully", "success");
        } else {
            const errorMsg = result.message
                ? `Failed to create snapshot: ${result.message}`
                : "Failed to create snapshot";

            this._guiMessageBroker.publishEvent(GuiEvent.SessionPersistenceError, {
                action: SessionPersistenceAction.CREATE_SNAPSHOT,
                error: new SessionPersistenceError(errorMsg),
                retry: () => this.createSnapshot(title, description, activeDashboardId),
            });
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

        this._workbench.getNavigationManager().pushState(buildWorkbenchUrl({ kind: "root" }));
    }

    // ========== Template Operations ==========

    async applyTemplate(template: Template): Promise<boolean> {
        if (!this.hasActiveSession()) {
            await this.startNewSession();
        }

        const activeSession = this.getActiveSession();
        const activeDashboard = activeSession.getActiveDashboard();
        const confirmationRequired = activeDashboard && activeDashboard.getModuleInstances().length > 0;

        if (confirmationRequired) {
            const result = await ConfirmationService.confirm({
                title: "Replace current dashboard with template?",
                message:
                    "By applying this template, your current dashboard will be replaced and lose its state. Do you want to proceed?",
                actions: [
                    { id: "cancel", label: "No, cancel" },
                    { id: "delete", label: "Yes, proceed", color: "danger" },
                ],
            });

            if (result === "cancel") {
                return false;
            }
        }

        const dashboard = await Dashboard.fromTemplate(
            template,
            activeSession.getAtomStoreMaster(),
            activeDashboard?.getId(),
        );
        if (activeDashboard) {
            // Applying a template only replaces the dashboard's layout/content; the dashboard's
            // own name and description should be kept as-is.
            dashboard.updateMetadata(activeDashboard.getMetadata());
            activeSession.replaceDashboard(activeDashboard.getId(), dashboard);
        } else {
            activeSession.setDashboards([dashboard]);
        }
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

            // Update GUI states based on possible loading errors
            this.applyActiveSessionEnsembleLoadErrorsToGuiState();
            this._guiMessageBroker.setState(GuiState.ActiveSessionRecoveryDialogOpen, false);
        } catch (error) {
            console.error("Failed to load workbench session from local storage:", error);

            const result = await ConfirmationService.confirm({
                variant: "error",
                title: "Could not load session from local storage",
                message: `Could not load workbench session from local storage. Discard corrupted session?`,
                actions: [
                    { id: "retry", label: "Retry" },
                    { id: "cancel", label: "No, cancel" },
                    { id: "discard", label: "Yes, discard", color: "danger" },
                ],
            });

            if (result === "discard") {
                this._guiMessageBroker.setState(GuiState.ActiveSessionRecoveryDialogOpen, false);
                this.discardLocalStorageSession(sessionId, false);

                if (!sessionId) {
                    await this.startNewSession();
                }
            }
            if (result === "retry") {
                return await this.updateFromLocalStorage();
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
        // When the user navigates with forward/backward buttons, they might want to load a snapshot/session.
        // Read once, atomically - openSession/openSnapshot below rewrites the URL's whole path.
        const location = readWorkbenchUrlLocation();

        // Navigating between dashboards of the open session - no need to close and reopen it
        if (location.kind !== "root" && this.isActiveSessionLocation(location)) {
            this.switchDashboardFromUrl(location.dashboardId);
            return true;
        }

        const result = await this.maybeCloseCurrentSession();
        if (!result) {
            return false; // User cancelled navigation
        }

        // No active session or no unsaved changes - load the requested entity
        if (location.kind === "snapshot") {
            const result = await this.openSnapshot(location.snapshotId, location.dashboardId);
            if (!result) {
                this._workbench.getNavigationManager().pushState(buildWorkbenchUrl({ kind: "root" }));
            }
        } else if (location.kind === "session") {
            const result = await this.openSession(location.sessionId, location.dashboardId);
            if (!result) {
                this._workbench.getNavigationManager().pushState(buildWorkbenchUrl({ kind: "root" }));
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
                onSuccess: (data) => {
                    replaceSessionQueryData(queryClient, data);
                    this.createToast("Session successfully updated.", "success");
                    success = true;
                },
                onError: (error) => {
                    console.error("Failed to update session:", error);
                    const apiError = ApiErrorHelper.fromError(error);
                    if (!apiError) {
                        this.createToast("An unknown error occurred while updating the session.", "error");
                        return;
                    }
                    console.error("API error details:", apiError.getMessage());
                    this.createToast(`Failed to update session: ${apiError.getMessage()}`, "error");
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
                        this.createToast("Session successfully deleted.", "success");
                        success = true;
                        removeSessionQueryData(this._queryClient, sessionId);
                    },
                })
                .execute({ path: { session_id: sessionId } });
        } catch (error) {
            this.dismissToast("deleteSession");
            this.createToast("An error occurred while deleting the session.", "error");
            console.error("Failed to delete session:", error);
        }

        return success;
    }

    async deleteSnapshot(snapshotId: string): Promise<boolean> {
        const result = await ConfirmationService.confirm({
            title: "Really delete snapshot?",
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
                        this.createToast("Snapshot successfully deleted.", "success");
                        success = true;
                        removeSnapshotQueryData(this._queryClient);
                    },
                })
                .execute({ path: { snapshot_id: snapshotId } });
        } catch (error) {
            this.dismissToast("deleteSnapshot");
            this.createToast("An error occurred while deleting the snapshot.", "error");
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
                        this.createToast("Snapshot successfully removed from list.", "success");
                        success = true;
                        removeSnapshotQueryData(this._queryClient);
                    },
                })
                .execute({ path: { snapshot_id: snapshotId } });
        } catch (error) {
            this.dismissToast("deleteSnapshotAccessLog");
            this.createToast("An error occurred while removing the snapshot from the list.", "error");
            console.error("Failed to delete snapshot access log:", error);
        }

        return success;
    }
}
