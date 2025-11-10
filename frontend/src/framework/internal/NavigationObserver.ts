/**
 * Observes browser navigation events and delegates to registered callbacks.
 *
 * Monitors:
 * - Browser back/forward navigation (popstate event)
 * - Page unload/refresh (beforeunload event)
 *
 * Unlike WindowActivityObserver, this is NOT a singleton because each Workbench
 * instance needs its own navigation handling (important for testing and isolation).
 */
export class NavigationObserver {
    private _currentUrl: string;
    private _boundHandleBeforeUnload: (event: BeforeUnloadEvent) => void;
    private _boundHandlePopState: () => void;

    // Callbacks for handling navigation logic
    private _onBeforeUnloadCallback: (() => boolean) | null = null;
    private _onNavigateCallback: (() => Promise<boolean>) | null = null;

    constructor() {
        this._currentUrl = window.location.href;

        // Bind event handlers once in constructor for better traceability
        this._boundHandleBeforeUnload = this.handleBeforeUnload.bind(this);
        this._boundHandlePopState = this.handlePopState.bind(this);

        // Register event listeners
        window.addEventListener("beforeunload", this._boundHandleBeforeUnload);
        window.addEventListener("popstate", this._boundHandlePopState);
    }

    /**
     * Register callback for beforeunload event.
     * Callback should return true if navigation should be blocked (show warning dialog).
     */
    setOnBeforeUnload(callback: (() => boolean) | null): void {
        this._onBeforeUnloadCallback = callback;
    }

    /**
     * Register callback for popstate event.
     * Callback should return true if navigation was handled successfully, false to cancel navigation.
     */
    setOnNavigate(callback: (() => Promise<boolean>) | null): void {
        this._onNavigateCallback = callback;
    }

    /**
     * Handle beforeunload event
     */
    private handleBeforeUnload(event: BeforeUnloadEvent): void {
        if (!this._onBeforeUnloadCallback) {
            return;
        }

        const shouldBlock = this._onBeforeUnloadCallback();

        if (shouldBlock) {
            event.preventDefault();
            event.returnValue = ""; // This is necessary for the dialog to show in some browsers.
        }
    }

    /**
     * Handle popstate event (browser back/forward navigation)
     */
    private async handlePopState(): Promise<void> {
        if (!this._onNavigateCallback) {
            this._currentUrl = window.location.href;
            return;
        }

        const previousUrl = this._currentUrl;
        const result = await this._onNavigateCallback();

        if (!result) {
            // Navigation was cancelled - restore previous URL
            window.history.pushState(null, "", previousUrl);
        } else {
            // Navigation succeeded - update current URL
            this._currentUrl = window.location.href;
        }
    }

    /**
     * Get the current URL
     */
    getCurrentUrl(): string {
        return this._currentUrl;
    }

    /**
     * Clean up event listeners - MUST be called when Workbench is destroyed
     */
    beforeDestroy(): void {
        window.removeEventListener("beforeunload", this._boundHandleBeforeUnload);
        window.removeEventListener("popstate", this._boundHandlePopState);

        this._onBeforeUnloadCallback = null;
        this._onNavigateCallback = null;
    }
}
