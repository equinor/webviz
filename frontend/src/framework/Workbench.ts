import type { QueryClient } from "@tanstack/react-query";

import { ConfirmationService } from "./ConfirmationService";
import { GuiMessageBroker } from "./GuiMessageBroker";
import { Dashboard } from "./internal/Dashboard";
import { NavigationObserver } from "./internal/NavigationObserver";
import { PrivateWorkbenchServices } from "./internal/PrivateWorkbenchServices";
import { WorkbenchSessionManager } from "./internal/WorkbenchSession/WorkbenchSessionManager";
import type { Template } from "./TemplateRegistry";
import type { WorkbenchServices } from "./WorkbenchServices";

/**
 * Main workbench coordinator.
 *
 * Delegates responsibilities:
 * - Session management -> WorkbenchSessionManager
 * - Persistence -> PersistenceOrchestrator (via SessionManager)
 * - Services -> PrivateWorkbenchServices
 * - GUI state -> GuiMessageBroker
 */
export class Workbench {
    private readonly _workbenchServices: PrivateWorkbenchServices;
    private readonly _guiMessageBroker: GuiMessageBroker;
    private readonly _queryClient: QueryClient;
    private readonly _sessionManager: WorkbenchSessionManager;
    private readonly _navigationObserver: NavigationObserver;
    private _isInitialized: boolean = false;

    constructor(queryClient: QueryClient) {
        this._queryClient = queryClient;
        this._workbenchServices = new PrivateWorkbenchServices(this);
        this._guiMessageBroker = new GuiMessageBroker();
        this._sessionManager = new WorkbenchSessionManager(this, queryClient, this._guiMessageBroker);

        // Create NavigationObserver instance and register callbacks
        this._navigationObserver = new NavigationObserver();
        this._navigationObserver.setOnBeforeUnload(() => this.handleBeforeUnload());
        this._navigationObserver.setOnNavigate(async () => this.handleNavigation());
    }

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

    async initialize() {
        if (this._isInitialized) {
            console.info(
                "Workbench is already initialized. This might happen in strict mode due to useEffects being called multiple times.",
            );
            return;
        }

        await this._sessionManager.maybeOpenFromUrl();
    }

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

    beforeDestroy(): void {
        this._navigationObserver.beforeDestroy();
        this._sessionManager.beforeDestroy();
    }
}
