import type {
    FetchQueryOptions,
    QueryClient,
    QueryKey,
    QueryObserverResult,
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
     */
    async fetchQuery<TQueryFnData, TError = unknown, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey>(
        options: FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey> & {
            staleWhileRevalidate?: boolean;
            refetchArgs?: RefetchArgs;
        },
    ): Promise<TData> {
        const { staleWhileRevalidate = false, refetchArgs, ...observerOpts } = options;
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

            const initial = observer.getCurrentResult();

            // Immediate error from cache
            if (initial.isError && initial.error) {
                finish(() => reject(initial.error as TError));
                return;
            }

            // Cache hit
            if (initial.isSuccess) {
                if (!initial.isStale || staleWhileRevalidate) {
                    // Return now; optionally refresh in background
                    if (initial.isStale && staleWhileRevalidate) {
                        // resolve now, but don't cleanup until refetch ends
                        observer.refetch(refetchArgs).finally(() => {
                            const current = this._entries.get(keyHash);
                            if (current && current.observer === observer) this.cleanupEntry(keyHash);
                        });
                        resolve(initial.data as TData);
                        return;
                    }
                    finish(() => resolve(initial.data as TData));
                    return;
                }

                // Stale and we want fresh -> wait for refetch
                observer
                    .refetch(refetchArgs)
                    .then((result) => {
                        if (result.isError && result.error) {
                            finish(() => reject(result.error as TError));
                        } else {
                            finish(() => resolve(result.data as TData));
                        }
                    })
                    .catch((err) => finish(() => reject(err as TError)));
                return;
            }

            // Pending/idle: subscribe and kick refetch
            entry.unsubscribe = observer.subscribe((result: QueryObserverResult<TData, TError>) => {
                const current = this._entries.get(keyHash);
                if (!current || current.observer !== observer) return; // older call, ignore

                if (result.isError && result.error) {
                    finish(() => reject(result.error));
                } else if (result.isSuccess) {
                    finish(() => resolve(result.data));
                }
            });

            try {
                observer.refetch(refetchArgs).catch((err) => {
                    finish(() => reject(err as TError));
                });
            } catch (err) {
                finish(() => reject(err as TError));
            }
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
