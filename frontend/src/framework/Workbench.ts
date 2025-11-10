import type { QueryClient } from "@tanstack/react-query";

import { PublishSubscribeDelegate, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";

import { ConfirmationService } from "./ConfirmationService";
import { GuiMessageBroker, GuiState } from "./GuiMessageBroker";
import { Dashboard } from "./internal/Dashboard";
import { EnsembleUpdateMonitor } from "./internal/EnsembleUpdateMonitor";
import { NavigationObserver } from "./internal/NavigationObserver";
import { PrivateWorkbenchServices } from "./internal/PrivateWorkbenchServices";
import { PrivateWorkbenchSession } from "./internal/WorkbenchSession/PrivateWorkbenchSession";
import {
    WorkbenchSessionManager,
    WorkbenchSessionManagerTopic,
} from "./internal/WorkbenchSession/WorkbenchSessionManager";
import { readSessionIdFromUrl, readSnapshotIdFromUrl } from "./internal/WorkbenchSession/utils/url";
import type { Template } from "./TemplateRegistry";
import type { WorkbenchServices } from "./WorkbenchServices";
import { loadAllWorkbenchSessionsFromLocalStorage } from "./internal/WorkbenchSession/utils/loaders";

export enum WorkbenchTopic {
    ACTIVE_SESSION = "activeSession",
    HAS_ACTIVE_SESSION = "hasActiveSession",
}

export type WorkbenchTopicPayloads = {
    [WorkbenchTopic.ACTIVE_SESSION]: PrivateWorkbenchSession | null;
    [WorkbenchTopic.HAS_ACTIVE_SESSION]: boolean;
};

/**
 * Main workbench coordinator.
 *
 * Delegates responsibilities:
 * - Session management -> WorkbenchSessionManager
 * - Persistence -> PersistenceOrchestrator (via SessionManager)
 * - Services -> PrivateWorkbenchServices
 * - GUI state -> GuiMessageBroker
 */
export class Workbench implements PublishSubscribe<WorkbenchTopicPayloads> {
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<WorkbenchTopicPayloads>();

    private _workbenchServices: PrivateWorkbenchServices;
    private _guiMessageBroker: GuiMessageBroker;
    private _queryClient: QueryClient;
    private _sessionManager: WorkbenchSessionManager;
    private _navigationObserver: NavigationObserver;
    private _ensembleUpdateMonitor: EnsembleUpdateMonitor;
    private _isInitialized: boolean = false;

    constructor(queryClient: QueryClient) {
        this._queryClient = queryClient;
        this._workbenchServices = new PrivateWorkbenchServices(this);
        this._guiMessageBroker = new GuiMessageBroker();
        this._ensembleUpdateMonitor = new EnsembleUpdateMonitor(queryClient, this);
        this._sessionManager = new WorkbenchSessionManager(this, queryClient, this._guiMessageBroker);

        // Create NavigationObserver instance and register callbacks
        this._navigationObserver = new NavigationObserver();
        this._navigationObserver.setOnBeforeUnload(() => this.handleBeforeUnload());
        this._navigationObserver.setOnNavigate(async () => this.handleNavigation());

        // Subscribe to session manager events to forward to workbench subscribers
        this._sessionManager
            .getPublishSubscribeDelegate()
            .makeSubscriberFunction(WorkbenchSessionManagerTopic.ACTIVE_SESSION)(() => {
            this._publishSubscribeDelegate.notifySubscribers(WorkbenchTopic.ACTIVE_SESSION);
        });

        this._sessionManager
            .getPublishSubscribeDelegate()
            .makeSubscriberFunction(WorkbenchSessionManagerTopic.HAS_ACTIVE_SESSION)(() => {
            this._publishSubscribeDelegate.notifySubscribers(WorkbenchTopic.HAS_ACTIVE_SESSION);
        });
    }

    // ========== PublishSubscribe Implementation ==========

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<WorkbenchTopicPayloads> {
        return this._publishSubscribeDelegate;
    }

    makeSnapshotGetter<T extends WorkbenchTopic>(topic: T): () => WorkbenchTopicPayloads[T] {
        return (): WorkbenchTopicPayloads[T] => {
            if (topic === WorkbenchTopic.ACTIVE_SESSION) {
                return this._sessionManager.getActiveSessionOrNull() as WorkbenchTopicPayloads[T];
            }
            if (topic === WorkbenchTopic.HAS_ACTIVE_SESSION) {
                return this._sessionManager.hasActiveSession() as WorkbenchTopicPayloads[T];
            }
            throw new Error(`No snapshot getter implemented for topic ${topic}`);
        };
    }

    // ========== Getters ==========

    getQueryClient(): QueryClient {
        return this._queryClient;
    }

    getSessionManager(): WorkbenchSessionManager {
        return this._sessionManager;
    }

    getWorkbenchServices(): WorkbenchServices {
        return this._workbenchServices;
    }

    getGuiMessageBroker(): GuiMessageBroker {
        return this._guiMessageBroker;
    }

    // ========== Navigation ==========

    /**
     * Handle beforeunload event - check if there are unsaved changes.
     * Returns true if navigation should be blocked (show warning dialog).
     */
    private handleBeforeUnload(): boolean {
        return this._sessionManager.hasDirtyChanges();
    }

    /**
     * Handle browser navigation (back/forward buttons).
     * Delegates to SessionManager for actual handling.
     * Returns true if navigation should proceed, false to cancel.
     */
    private async handleNavigation(): Promise<boolean> {
        return this._sessionManager.handleNavigation();
    }

    // ========== Initialization ==========

    async initialize() {
        if (this._isInitialized) {
            console.info(
                "Workbench is already initialized. This might happen in strict mode due to useEffects being called multiple times.",
            );
            return;
        }

        this._isInitialized = true;

        // Check if a snapshot/session id is in the URL
        const snapshotId = readSnapshotIdFromUrl();
        const sessionId = readSessionIdFromUrl();

        const storedSessions = await loadAllWorkbenchSessionsFromLocalStorage();

        if (snapshotId) {
            this._sessionManager.openSnapshot(snapshotId);
            return;
        } else if (sessionId) {
            this._sessionManager.openSession(sessionId);
            if (storedSessions.find((el) => el.id === sessionId)) {
                this._guiMessageBroker.setState(GuiState.ActiveSessionRecoveryDialogOpen, true);
            }
            return;
        }

        if (storedSessions.length > 0) {
            this._guiMessageBroker.setState(GuiState.MultiSessionsRecoveryDialogOpen, true);
        }
    }

    // ========== Template Application ==========

    async applyTemplate(template: Template): Promise<boolean> {
        if (!this._sessionManager.hasActiveSession()) {
            await this._sessionManager.startNewSession();
        } else {
            const activeSession = this._sessionManager.getActiveSession();
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

        const activeSession = this._sessionManager.getActiveSession();
        const dashboard = await Dashboard.fromTemplate(template, activeSession.getAtomStoreMaster());
        activeSession.setDashboards([dashboard]);
        return true;
    }

    // ========== Lifecycle ==========

    beforeDestroy(): void {
        this._navigationObserver.destroy();
    }
}
