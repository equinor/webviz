import { CancelablePromise } from "@api";
import { FetchQueryOptions, QueryClient } from "@tanstack/react-query";

export function cancelPromiseOnAbort<T>(promise: CancelablePromise<T>, abortSignal: AbortSignal): Promise<T> {
    abortSignal.addEventListener("abort", () => {
        console.debug("Promise aborted");
        promise.cancel();
    });
    return promise;
}

export async function cancelQueryOnAbort<T>(
    queryClient: QueryClient,
    abortSignal: AbortSignal,
    options: FetchQueryOptions<T>
) {
    abortSignal.addEventListener("abort", () => {
        queryClient.cancelQueries({ queryKey: options.queryKey });
    });

    return await queryClient.fetchQuery(options);
}
