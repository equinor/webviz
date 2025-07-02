export type NavigationObserverOptions = {
    onBeforeUnload?: () => boolean;
    onNavigate?: () => Promise<boolean>;
};

export class NavigationObserver {
    private readonly _options: NavigationObserverOptions;

    constructor(options: NavigationObserverOptions) {
        this._options = options;

        window.addEventListener("beforeunload", this.handleBeforeUnload.bind(this));
        window.addEventListener("popstate", this.handlePopState.bind(this));
    }

    private async handleBeforeUnload(event: BeforeUnloadEvent) {
        const { onBeforeUnload } = this._options;
        if (!onBeforeUnload) {
            return;
        }
        const result = onBeforeUnload();

        if (!result) {
            event.preventDefault();
            event.returnValue = ""; // This is necessary for the dialog to show in some browsers.
        }
    }

    private async handlePopState() {
        const { onNavigate } = this._options;
        if (!onNavigate) {
            return;
        }

        const result = await onNavigate();

        if (!result) {
            // If the navigation was not handled, we can prevent the default behavior.
            // Note: This is a workaround, as popstate does not allow preventing default behavior.
            // Instead, we can use a custom logic to handle the navigation.
            window.history.pushState(null, "", window.location.href);
        }
    }

    beforeDestroy(): void {
        window.removeEventListener("beforeunload", this.handleBeforeUnload.bind(this));
        window.removeEventListener("popstate", this.handlePopState.bind(this));
    }
}
