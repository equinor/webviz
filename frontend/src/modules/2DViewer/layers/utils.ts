import { CancelablePromise } from "@api";

export function cancelPromiseOnAbort<T>(promise: CancelablePromise<T>, abortSignal: AbortSignal): Promise<T> {
    abortSignal.addEventListener("abort", () => {
        promise.cancel();
    });
    return promise;
}
