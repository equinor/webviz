export type NavigationObserverOptions = {
    onBeforeUnload?: () => boolean;
    onNavigate?: () => Promise<boolean>;
};

export class NavigationObserver {
    private readonly _options: NavigationObserverOptions;

    private _currentUrl: string = window.location.href;
    private readonly handleBeforeUnloadBound = this.handleBeforeUnload.bind(this);
    private readonly handlePopStateBound = this.handlePopState.bind(this);

    constructor(options: NavigationObserverOptions) {
        this._options = options;

        window.addEventListener("beforeunload", this.handleBeforeUnloadBound);
        window.addEventListener("popstate", this.handlePopStateBound);
    }

    private async handleBeforeUnload(event: BeforeUnloadEvent) {
        const { onBeforeUnload } = this._options;
        if (!onBeforeUnload) {
            return;
        }

        const result = onBeforeUnload();

        if (result) {
            event.preventDefault();
            event.returnValue = ""; // This is necessary for the dialog to show in some browsers.
        }
    }

    private async handlePopState() {
        const { onNavigate } = this._options;
        if (!onNavigate) {
            return;
        }

        const previousUrl = this._currentUrl;
        const result = await onNavigate();

        if (!result) {
            // If the navigation was not handled, we can prevent the default behavior.
            // Note: This is a workaround, as popstate does not allow preventing default behavior.
            // Instead, we can use a custom logic to handle the navigation.
            window.history.pushState(null, "", previousUrl);
        } else {
            this._currentUrl = window.location.href;
        }
    }

    beforeDestroy(): void {
        window.removeEventListener("beforeunload", this.handleBeforeUnloadBound);
        window.removeEventListener("popstate", this.handlePopStateBound);
    }
}
