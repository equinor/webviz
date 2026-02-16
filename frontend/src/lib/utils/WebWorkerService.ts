import { wrap, type Remote } from "comlink";

/**
 * A utility class to manage a web worker and its Comlink proxy.
 *
 * The `getProxy` method initializes the worker and proxy on first call, and returns the proxy for making calls to the worker.
 * The `terminate` method can be used to clean up the worker and proxy when they are no longer needed.
 *
 * This class is designed to work with any worker that exposes an API compatible with Comlink,
 * and it abstracts away the details of worker management.
 */
export class WebWorkerService<T> {
    private worker: Worker | null = null;
    private proxy: Remote<T> | null = null;

    constructor(private WorkerCtor: new () => Worker) {}

    getProxy(): Remote<T> {
        if (!this.worker) {
            this.worker = new this.WorkerCtor();
            this.proxy = wrap<T>(this.worker);
        }
        return this.proxy!;
    }

    terminate(): void {
        this.worker?.terminate();
        this.worker = null;
        this.proxy = null;
    }
}
