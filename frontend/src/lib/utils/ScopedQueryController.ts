import type {
    FetchQueryOptions,
    QueryClient,
    QueryKey,
    RefetchOptions,
    RefetchQueryFilters,
} from "@tanstack/react-query";
import { CancelledError, QueryObserver, hashKey } from "@tanstack/react-query";

type RefetchArgs = RefetchOptions & RefetchQueryFilters;

type Entry = {
    observer: QueryObserver<any, any, any, any, any>;
    unsubscribe?: () => void;
    reject?: (err: unknown) => void;
};

export class ScopedQueryController {
    private _queryClient: QueryClient;
    private _entries = new Map<string, Entry>();

    constructor(queryClient: QueryClient) {
        this._queryClient = queryClient;
    }

    /** Cancel the active fetch for a specific key (or all if none provided). */
    cancelActiveFetch(queryKey?: QueryKey): void {
        if (!queryKey) {
            this.cleanupAll(true);
            return;
        }
        const hash = hashKey(queryKey);
        this.cleanupEntry(hash, true);
    }

    /**
     * One-at-a-time per key. Fresh-by-default.
     * If you want stale-while-revalidate, pass { staleWhileRevalidate: true }.
     * To refetch instead of rejecting with an error cached from an earlier fetch, pass { refetchOnError: true }.
     */
    async fetchQuery<TQueryFnData, TError = unknown, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey>(
        options: FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey> & {
            staleWhileRevalidate?: boolean;
            refetchOnError?: boolean;
            refetchArgs?: RefetchArgs;
        },
    ): Promise<TData> {
        const { staleWhileRevalidate = false, refetchOnError = false, refetchArgs, ...observerOpts } = options;
        const keyHash = hashKey(observerOpts.queryKey as QueryKey);

        this.cleanupEntry(keyHash, true);

        const observer = new QueryObserver<TQueryFnData, TError, TData, TData, TQueryKey>(
            this._queryClient,
            observerOpts as FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
        );

        const entry: Entry = { observer };
        this._entries.set(keyHash, entry);

        return new Promise<TData>((resolve, reject) => {
            entry.reject = reject;

            const finish = (fn: () => void) => {
                // Only finish if this is still the active entry for this key
                const current = this._entries.get(keyHash);
                if (current && current.observer === observer) {
                    this.cleanupEntry(keyHash);
                    fn();
                }
            };

            // Subscribed while a refetch is pending, so cleanup can cancel the request. Subscribing after starting the
            // refetch joins it instead of starting another one.
            const refetchAndKeepCancellable = (args?: RefetchArgs) => {
                const refetchPromise = observer.refetch(args);
                entry.unsubscribe = observer.subscribe(() => {});
                return refetchPromise;
            };

            // Refetch, and settle with the outcome of that fetch. Throwing on error also rejects when the fetch is
            // cancelled outside of this controller (e.g. by clearing the query cache), which would otherwise never settle.
            const refetchAndSettle = () => {
                try {
                    refetchAndKeepCancellable({ ...refetchArgs, throwOnError: true })
                        .then((result) => finish(() => resolve(result.data as TData)))
                        .catch((err) => finish(() => reject(err as TError)));
                } catch (err) {
                    finish(() => reject(err as TError));
                }
            };

            const initial = observer.getCurrentResult();

            // Error from cache
            if (initial.isError) {
                if (refetchOnError) {
                    refetchAndSettle();
                    return;
                }
                finish(() => reject(initial.error as TError));
                return;
            }

            // Cache hit
            if (initial.isSuccess && (!initial.isStale || staleWhileRevalidate)) {
                if (initial.isStale) {
                    // Return now and refresh in the background, but don't cleanup until the refetch ends
                    refetchAndKeepCancellable(refetchArgs).finally(() => {
                        const current = this._entries.get(keyHash);
                        if (current && current.observer === observer) this.cleanupEntry(keyHash);
                    });
                    resolve(initial.data as TData);
                    return;
                }
                finish(() => resolve(initial.data as TData));
                return;
            }

            // Nothing cached yet, or stale and we want fresh -> wait for refetch
            refetchAndSettle();
        });
    }

    /** Clean up everything (all keys). */
    private cleanupAll(rejectPending = false) {
        for (const hash of Array.from(this._entries.keys())) {
            this.cleanupEntry(hash, rejectPending);
        }
    }

    /** Clean up one entry by hash. */
    private cleanupEntry(hash: string, rejectPending = false) {
        const entry = this._entries.get(hash);

        if (!entry) return;

        try {
            entry.unsubscribe?.();
        } catch {
            // Ignore
        }
        entry.unsubscribe = undefined;

        try {
            entry.observer.destroy();
        } catch {
            // Ignore
        }

        if (rejectPending) {
            try {
                entry.reject?.(new CancelledError());
            } catch {
                // Ignore
            }
        }

        this._entries.delete(hash);
    }
}
