/**
 * Manages browser navigation - both observing and controlling URL changes.
 *
 * Responsibilities:
 * - Observes browser back/forward navigation (popstate event)
 * - Observes page unload/refresh (beforeunload event)
 * - Provides programmatic navigation (pushState/replaceState)
 * - Tracks current URL to enable navigation cancellation
 *
 * Unlike WindowActivityObserver, this is NOT a singleton because each Workbench
 * instance needs its own navigation handling (important for testing and isolation).
 */

// Each history entry created by this page is numbered, so that a popstate tells how far and in which
// direction the user moved - no matter if via back/forward buttons or by picking an entry directly
type NavigationHistoryState = { entryIndex: number };

function makeHistoryState(entryIndex: number): NavigationHistoryState {
    return { entryIndex };
}

function readEntryIndex(state: unknown): number | null {
    if (typeof state === "object" && state !== null && "entryIndex" in state) {
        return typeof state.entryIndex === "number" ? state.entryIndex : null;
    }
    return null;
}

export class NavigationManager {
    private _currentUrl: string;
    private _boundHandleBeforeUnload: (event: BeforeUnloadEvent) => void;
    private _boundHandlePopState: (event: PopStateEvent) => void;
    private _isStarted = false;

    private _currentIndex = 0;
    // Newest existing entry - pushing a new entry discards all entries after the current one
    private _maxIndex = 0;
    // Index difference of the latest popstate, null if unknown (entry not created by this page)
    private _lastStep: number | null = null;
    private _isSkipping = false;

    // Callbacks for handling navigation logic
    private _onBeforeUnloadCallback: (() => boolean) | null = null;
    private _onNavigateCallback: (() => Promise<boolean>) | null = null;

    constructor() {
        this._currentUrl = window.location.href;

        // Bind event handlers once in constructor for better traceability
        this._boundHandleBeforeUnload = this.handleBeforeUnload.bind(this);
        this._boundHandlePopState = this.handlePopState.bind(this);
    }

    /**
     * Start listening to browser navigation. Kept out of the constructor so that constructing a
     * Workbench has no side effects - StrictMode constructs and discards an extra instance, whose
     * listeners would otherwise keep reacting to back/forward navigation.
     */
    start(): void {
        if (this._isStarted) {
            return;
        }
        this._isStarted = true;
        this._currentUrl = window.location.href;

        // Renumber the page-load entry - after a reload, it still carries the previous page's number
        this._currentIndex = 0;
        this._maxIndex = 0;
        window.history.replaceState(makeHistoryState(0), "", window.location.href);

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
    private async handlePopState(event: PopStateEvent): Promise<void> {
        const landedIndex = readEntryIndex(event.state);
        this._lastStep = landedIndex === null ? null : landedIndex - this._currentIndex;
        if (landedIndex !== null) {
            this._currentIndex = landedIndex;
        }

        if (!this._onNavigateCallback) {
            this._currentUrl = window.location.href;
            return;
        }

        const previousUrl = this._currentUrl;
        const result = await this._onNavigateCallback();

        if (!result) {
            // Navigation was cancelled - restore previous URL
            this.pushState(previousUrl);
        } else if (this._isSkipping) {
            // The skipped entry was never shown - previousUrl stays current until the skip lands
            this._isSkipping = false;
        } else {
            // Navigation succeeded - update current URL
            this._currentUrl = window.location.href;
        }
    }

    /**
     * Moves on past the entry just navigated to (e.g. one pointing at a deleted dashboard), in the
     * same direction. Only done after a single back/forward step - an entry picked further away was
     * chosen deliberately - and only onto an entry created by this page, so it never leaves the app.
     * Must be called from within the navigate callback.
     * @returns Whether the skip was started.
     */
    skipEntry(): boolean {
        if (this._lastStep !== 1 && this._lastStep !== -1) {
            return false;
        }
        const targetIndex = this._currentIndex + this._lastStep;
        if (targetIndex < 0 || targetIndex > this._maxIndex) {
            return false;
        }
        this._isSkipping = true;
        window.history.go(this._lastStep);
        return true;
    }

    /**
     * Get the current URL
     */
    getCurrentUrl(): string {
        return this._currentUrl;
    }

    /**
     * Programmatically navigate to a new URL using pushState.
     * This updates both the browser URL and the tracked current URL.
     * Use this instead of calling window.history.pushState() directly.
     */
    pushState(url: string): void {
        this._currentIndex += 1;
        this._maxIndex = this._currentIndex;
        window.history.pushState(makeHistoryState(this._currentIndex), "", url);
        this._currentUrl = url;
    }

    /**
     * Programmatically update the current URL using replaceState.
     * This updates both the browser URL and the tracked current URL.
     * Use this instead of calling window.history.replaceState() directly.
     */
    replaceState(url: string): void {
        window.history.replaceState(makeHistoryState(this._currentIndex), "", url);
        this._currentUrl = url;
    }

    /**
     * Clean up event listeners - MUST be called when Workbench is destroyed
     */
    beforeDestroy(): void {
        window.removeEventListener("beforeunload", this._boundHandleBeforeUnload);
        window.removeEventListener("popstate", this._boundHandlePopState);
        this._isStarted = false;

        this._onBeforeUnloadCallback = null;
        this._onNavigateCallback = null;
    }
}
