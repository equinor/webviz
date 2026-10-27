/** The cleanup callbacks of one step invocation, run once when it finishes or is cancelled. */
export class QcCheckCleanupScope {
    private _callbacks: (() => void)[] = [];
    private _hasRun = false;
    private _onRun: (() => void) | null;

    constructor(onRun?: () => void) {
        this._onRun = onRun ?? null;
    }

    add(callback: () => void): void {
        if (this._hasRun) {
            // Registered after the cleanup has run - clean up right away
            runCallback(callback);
            return;
        }
        this._callbacks.push(callback);
    }

    run(): void {
        if (this._hasRun) {
            return;
        }
        this._hasRun = true;
        const callbacks = this._callbacks;
        this._callbacks = [];
        callbacks.forEach(runCallback);
        this._onRun?.();
    }
}

// A throwing callback must not stop the others
function runCallback(callback: () => void): void {
    try {
        callback();
    } catch (error) {
        console.error("QC check cleanup callback failed:", error);
    }
}
