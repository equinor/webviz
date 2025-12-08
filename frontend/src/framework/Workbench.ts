import type { QueryClient } from "@tanstack/react-query";

import { GuiMessageBroker } from "./GuiMessageBroker";
import { HoverService } from "./HoverService";
import { NavigationManager } from "./internal/NavigationManager";
import { PrivateWorkbenchServices } from "./internal/PrivateWorkbenchServices";
import { WorkbenchSessionManager } from "./internal/WorkbenchSession/WorkbenchSessionManager";
import type { WorkbenchServices } from "./WorkbenchServices";

/**
 * Main workbench coordinator.
 *
 * Delegates responsibilities:
 * - Session management -> WorkbenchSessionManager
 * - Navigation -> NavigationManager
 * - Persistence -> PersistenceOrchestrator (via SessionManager)
 * - Services -> PrivateWorkbenchServices
 * - GUI state -> GuiMessageBroker
 */
export class Workbench {
    private readonly _workbenchServices: PrivateWorkbenchServices;
    private _hoverService: HoverService;
    private readonly _guiMessageBroker: GuiMessageBroker;
    private readonly _queryClient: QueryClient;
    private readonly _sessionManager: WorkbenchSessionManager;
    private readonly _navigationManager: NavigationManager;
    private _isInitialized: boolean = false;

    constructor(queryClient: QueryClient) {
        this._queryClient = queryClient;
        this._workbenchServices = new PrivateWorkbenchServices(this);
        this._hoverService = new HoverService();
        this._guiMessageBroker = new GuiMessageBroker();
        this._sessionManager = new WorkbenchSessionManager(this, queryClient, this._guiMessageBroker);

        // Create NavigationManager instance and register callbacks
        this._navigationManager = new NavigationManager();
        this._navigationManager.setOnBeforeUnload(() => this.handleBeforeUnload());
        this._navigationManager.setOnNavigate(async () => await this.handleNavigation());
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

    getHoverService(): HoverService {
        return this._hoverService;
    }

    getGuiMessageBroker(): GuiMessageBroker {
        return this._guiMessageBroker;
    }

    getNavigationManager(): NavigationManager {
        return this._navigationManager;
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
        return await this._sessionManager.handleNavigation();
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

    beforeDestroy(): void {
        this._navigationManager.beforeDestroy();
        this._sessionManager.beforeDestroy();
    }
}
