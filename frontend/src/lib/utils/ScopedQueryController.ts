import type { FetchQueryOptions, QueryClient, QueryKey, QueryObserverResult } from "@tanstack/react-query";
import { QueryObserver } from "@tanstack/react-query";

/**
 * Manages exactly one active query (serial execution, latest-wins).
 * Uses a TanStack QueryObserver under the hood; teardown unsubscribes/destroys
 * only this observer, so in-flight fetches abort **only if no other observers**
 * exist for the same queryKey.
 */
export class ScopedQueryController {
    private _queryClient: QueryClient;
    private _activeObserver: QueryObserver<any, any, any, any, any> | null = null;
    private _unsubscribeFn: (() => void) | null = null;

    constructor(queryClient: QueryClient) {
        this._queryClient = queryClient;
    }

    cancelActiveFetch(): void {
        this.cleanup();
    }

    async fetchQuery<TQueryFnData, TError = Error, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey>(
        options: FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
    ): Promise<TData> {
        this.cleanup();

        const observer = new QueryObserver<TQueryFnData, TError, TData, TData, TQueryKey>(this._queryClient, {
            ...options,
        });

        this._activeObserver = observer;

        return new Promise<TData>((resolve, reject) => {
            const initial = observer.getCurrentResult();

            if (initial.isError && initial.error) {
                this.cleanup();
                reject(initial.error);
                return;
            }

            if (initial.isSuccess) {
                if (!initial.isStale) {
                    this.cleanup();
                    resolve(initial.data);
                    return;
                }
                const current = observer;
                observer.refetch().finally(() => {
                    if (this._activeObserver === current) {
                        this.cleanup();
                    }
                });
                resolve(initial.data);
                return;
            }

            this._unsubscribeFn = observer.subscribe((result: QueryObserverResult<TData, TError>) => {
                if (result.isError && result.error) {
                    this.cleanup();
                    reject(result.error);
                } else if (result.isSuccess) {
                    this.cleanup();
                    resolve(result.data);
                }
            });

            observer.refetch().catch((err) => {
                this.cleanup();
                reject(err);
            });
        });
    }

    private cleanup() {
        if (this._unsubscribeFn) {
            this._unsubscribeFn();
            this._unsubscribeFn = null;
        }
        if (this._activeObserver) {
            this._activeObserver.destroy();
            this._activeObserver = null;
        }
    }
}
