import type { FetchQueryOptions, QueryClient, QueryKey, QueryObserverResult } from "@tanstack/react-query";
import { QueryObserver } from "@tanstack/react-query";

/**
 * Manages a single active query fetch via a QueryObserver, with built-in cancellation
 * and race-condition-safe lifecycle.
 */
export class CancelableQueryRunner {
    private _queryClient: QueryClient;
    private _activeObserver: QueryObserver<any, any, any, any, any> | null = null;
    private _unsubscribeFn: (() => void) | null = null;

    constructor(queryClient: QueryClient) {
        this._queryClient = queryClient;
    }

    cancelActiveFetch(): void {
        this.cleanup();
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

    async run<TQueryFnData, TError = Error, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey>(
        options: FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
    ): Promise<TData> {
        this.cancelActiveFetch();

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
                        this.cancelActiveFetch();
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
}
