/**
 * The cleanup callbacks one step invocation (one step, for one matrix coordinate, in one check run) registers via
 * `QcCheckStepRunContext.onFetchCancelOrFinish`. They are run exactly once - when the invocation finishes, or when its
 * run is cancelled or superseded, whichever comes first.
 */
export class QcCheckCleanupScope {
    private _callbacks: (() => void)[] = [];
    private _hasRun = false;
    private _onRun: (() => void) | null;

    constructor(onRun?: () => void) {
        this._onRun = onRun ?? null;
    }

    add(callback: () => void): void {
        if (this._hasRun) {
            // Registered too late to be called by the cleanup - clean up right away instead
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

// A throwing callback must neither keep the others from running nor escape into the step runtime's `finally`
function runCallback(callback: () => void): void {
    try {
        callback();
    } catch (error) {
        console.error("QC check cleanup callback failed:", error);
    }
}
