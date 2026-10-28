import { CancelledError, QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { ScopedQueryController } from "@lib/utils/ScopedQueryController";

type Deferred<T> = {
    promise: Promise<T>;
    resolve: (value: T) => void;
    reject: (error: unknown) => void;
};

function makeDeferred<T>(): Deferred<T> {
    let resolve!: (value: T) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

// A query function whose calls are settled by the test. Reading the signal lets TanStack abort the request once
// the last observer is gone.
function makeControlledQueryFn<T>() {
    const calls: { deferred: Deferred<T>; signal: AbortSignal }[] = [];
    function queryFn({ signal }: { signal: AbortSignal }): Promise<T> {
        const deferred = makeDeferred<T>();
        calls.push({ deferred, signal });
        return deferred.promise;
    }
    return { queryFn, calls };
}

type SettledState<T> =
    | { status: "pending" }
    | { status: "resolved"; value: T }
    | { status: "rejected"; error: unknown };

// Lets pending promises and TanStack's scheduled notifications run
function flush(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

// The state of a promise once everything pending has run - "pending" means it would hang
async function getSettledState<T>(promise: Promise<T>): Promise<SettledState<T>> {
    let state: SettledState<T> = { status: "pending" };
    promise.then(
        (value) => (state = { status: "resolved", value }),
        (error) => (state = { status: "rejected", error }),
    );
    await flush();
    await flush();
    return state;
}

const QUERY_KEY = ["test-query"];
const OTHER_QUERY_KEY = ["other-test-query"];

describe("ScopedQueryController", () => {
    let queryClient: QueryClient;
    let controller: ScopedQueryController;

    beforeEach(() => {
        queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        controller = new ScopedQueryController(queryClient);
    });

    afterEach(() => {
        queryClient.clear();
    });

    function getObserverCount(queryKey = QUERY_KEY): number {
        return queryClient.getQueryCache().find({ queryKey })?.getObserversCount() ?? 0;
    }

    async function cacheError(error: Error, queryKey = QUERY_KEY): Promise<void> {
        await queryClient
            .fetchQuery({
                queryKey,
                queryFn: () => Promise.reject(error),
            })
            .catch(() => {});
    }

    describe("fetchQuery", () => {
        test("fetches and resolves with the data when nothing is cached", async () => {
            const { queryFn, calls } = makeControlledQueryFn<string>();

            const promise = controller.fetchQuery({ queryKey: QUERY_KEY, queryFn });
            await flush();
            calls[0].deferred.resolve("data");

            await expect(promise).resolves.toBe("data");
            expect(calls).toHaveLength(1);
            expect(queryClient.getQueryData(QUERY_KEY)).toBe("data");
        });

        test("rejects with the error of a failing fetch", async () => {
            const { queryFn, calls } = makeControlledQueryFn<string>();
            const error = new Error("fetch failed");

            const promise = controller.fetchQuery({ queryKey: QUERY_KEY, queryFn });
            await flush();
            calls[0].deferred.reject(error);

            await expect(promise).rejects.toBe(error);
        });

        test("rejects when the query function throws a falsy value", async () => {
            const { queryFn, calls } = makeControlledQueryFn<string>();

            const promise = controller.fetchQuery({ queryKey: QUERY_KEY, queryFn });
            await flush();
            calls[0].deferred.reject(null);

            expect(await getSettledState(promise)).toEqual({ status: "rejected", error: null });
        });

        test("resolves with fresh cached data without fetching", async () => {
            const { queryFn, calls } = makeControlledQueryFn<string>();
            queryClient.setQueryData(QUERY_KEY, "cached");

            const promise = controller.fetchQuery({ queryKey: QUERY_KEY, queryFn, staleTime: Infinity });

            await expect(promise).resolves.toBe("cached");
            expect(calls).toHaveLength(0);
        });

        test("refetches stale cached data with a single request and resolves with the fresh data", async () => {
            const { queryFn, calls } = makeControlledQueryFn<string>();
            queryClient.setQueryData(QUERY_KEY, "stale");

            const promise = controller.fetchQuery({ queryKey: QUERY_KEY, queryFn, staleTime: 0 });
            await flush();
            expect(calls).toHaveLength(1);
            calls[0].deferred.resolve("fresh");

            await expect(promise).resolves.toBe("fresh");
            expect(calls).toHaveLength(1);
        });

        test("rejects with an error cached from an earlier fetch without fetching", async () => {
            const { queryFn, calls } = makeControlledQueryFn<string>();
            const error = new Error("cached failure");
            await cacheError(error);

            const promise = controller.fetchQuery({ queryKey: QUERY_KEY, queryFn });

            await expect(promise).rejects.toBe(error);
            expect(calls).toHaveLength(0);
        });

        test("refetches instead of rejecting with a cached error when refetchOnError is set", async () => {
            const { queryFn, calls } = makeControlledQueryFn<string>();
            await cacheError(new Error("cached failure"));

            const promise = controller.fetchQuery({ queryKey: QUERY_KEY, queryFn, refetchOnError: true });
            await flush();
            expect(calls).toHaveLength(1);
            calls[0].deferred.resolve("recovered");

            await expect(promise).resolves.toBe("recovered");
            expect(calls).toHaveLength(1);
        });

        test("rejects with the new error when a refetch after a cached error fails again", async () => {
            const { queryFn, calls } = makeControlledQueryFn<string>();
            const newError = new Error("still failing");
            await cacheError(new Error("cached failure"));

            const promise = controller.fetchQuery({ queryKey: QUERY_KEY, queryFn, refetchOnError: true });
            await flush();
            calls[0].deferred.reject(newError);

            await expect(promise).rejects.toBe(newError);
        });

        test("resolves with stale data at once and refreshes it in the background with staleWhileRevalidate", async () => {
            const { queryFn, calls } = makeControlledQueryFn<string>();
            queryClient.setQueryData(QUERY_KEY, "stale");

            const promise = controller.fetchQuery({
                queryKey: QUERY_KEY,
                queryFn,
                staleTime: 0,
                staleWhileRevalidate: true,
            });

            await expect(promise).resolves.toBe("stale");
            await flush();
            expect(calls).toHaveLength(1);

            calls[0].deferred.resolve("fresh");
            await flush();
            expect(queryClient.getQueryData(QUERY_KEY)).toBe("fresh");
            expect(getObserverCount()).toBe(0);
        });

        test("doesn't refresh fresh data with staleWhileRevalidate", async () => {
            const { queryFn, calls } = makeControlledQueryFn<string>();
            queryClient.setQueryData(QUERY_KEY, "cached");

            const promise = controller.fetchQuery({
                queryKey: QUERY_KEY,
                queryFn,
                staleTime: Infinity,
                staleWhileRevalidate: true,
            });

            await expect(promise).resolves.toBe("cached");
            await flush();
            expect(calls).toHaveLength(0);
        });

        test("supersedes an earlier call for the same key and aborts its request", async () => {
            const { queryFn, calls } = makeControlledQueryFn<string>();

            const firstPromise = controller.fetchQuery({ queryKey: QUERY_KEY, queryFn });
            await flush();
            const secondPromise = controller.fetchQuery({ queryKey: QUERY_KEY, queryFn });

            await expect(firstPromise).rejects.toBeInstanceOf(CancelledError);
            expect(calls[0].signal.aborted).toBe(true);

            await flush();
            calls[1].deferred.resolve("second");
            await expect(secondPromise).resolves.toBe("second");
        });

        test("runs calls for different keys independently", async () => {
            const { queryFn, calls } = makeControlledQueryFn<string>();

            const firstPromise = controller.fetchQuery({ queryKey: QUERY_KEY, queryFn });
            const otherPromise = controller.fetchQuery({ queryKey: OTHER_QUERY_KEY, queryFn });
            await flush();
            expect(calls).toHaveLength(2);

            calls[0].deferred.resolve("first");
            calls[1].deferred.resolve("other");

            await expect(firstPromise).resolves.toBe("first");
            await expect(otherPromise).resolves.toBe("other");
        });

        test("rejects with a cancelled error when the query is cancelled outside the controller", async () => {
            const { queryFn } = makeControlledQueryFn<string>();

            const promise = controller.fetchQuery({ queryKey: QUERY_KEY, queryFn });
            await flush();
            await queryClient.cancelQueries({ queryKey: QUERY_KEY });

            const state = await getSettledState(promise);
            expect(state.status).toBe("rejected");
            expect(state.status === "rejected" && state.error).toBeInstanceOf(CancelledError);
        });

        test("rejects with a cancelled error when the query cache is cleared", async () => {
            const { queryFn } = makeControlledQueryFn<string>();

            const promise = controller.fetchQuery({ queryKey: QUERY_KEY, queryFn });
            await flush();
            queryClient.clear();

            const state = await getSettledState(promise);
            expect(state.status).toBe("rejected");
            expect(state.status === "rejected" && state.error).toBeInstanceOf(CancelledError);
        });

        test("stops observing the query once settled", async () => {
            const { queryFn, calls } = makeControlledQueryFn<string>();

            const promise = controller.fetchQuery({ queryKey: QUERY_KEY, queryFn });
            await flush();
            expect(getObserverCount()).toBe(1);
            calls[0].deferred.resolve("data");
            await promise;

            expect(getObserverCount()).toBe(0);
        });
    });

    describe("cancelActiveFetch", () => {
        test("rejects all pending calls with a cancelled error and aborts their requests when no key is given", async () => {
            const { queryFn, calls } = makeControlledQueryFn<string>();

            const firstPromise = controller.fetchQuery({ queryKey: QUERY_KEY, queryFn });
            const otherPromise = controller.fetchQuery({ queryKey: OTHER_QUERY_KEY, queryFn });
            await flush();
            controller.cancelActiveFetch();

            await expect(firstPromise).rejects.toBeInstanceOf(CancelledError);
            await expect(otherPromise).rejects.toBeInstanceOf(CancelledError);
            expect(calls.every((call) => call.signal.aborted)).toBe(true);
            expect(getObserverCount(QUERY_KEY)).toBe(0);
            expect(getObserverCount(OTHER_QUERY_KEY)).toBe(0);
        });

        test("only cancels the call for the given key", async () => {
            const { queryFn, calls } = makeControlledQueryFn<string>();

            const firstPromise = controller.fetchQuery({ queryKey: QUERY_KEY, queryFn });
            const otherPromise = controller.fetchQuery({ queryKey: OTHER_QUERY_KEY, queryFn });
            await flush();
            controller.cancelActiveFetch(QUERY_KEY);

            await expect(firstPromise).rejects.toBeInstanceOf(CancelledError);
            expect(calls[0].signal.aborted).toBe(true);
            expect(calls[1].signal.aborted).toBe(false);

            calls[1].deferred.resolve("other");
            await expect(otherPromise).resolves.toBe("other");
        });

        test("aborts the refetch of stale data", async () => {
            const { queryFn, calls } = makeControlledQueryFn<string>();
            queryClient.setQueryData(QUERY_KEY, "stale");

            const promise = controller.fetchQuery({ queryKey: QUERY_KEY, queryFn, staleTime: 0 });
            await flush();
            controller.cancelActiveFetch();

            await expect(promise).rejects.toBeInstanceOf(CancelledError);
            expect(calls[0].signal.aborted).toBe(true);
            expect(queryClient.getQueryData(QUERY_KEY)).toBe("stale");
        });

        test("aborts the refetch after a cached error", async () => {
            const { queryFn, calls } = makeControlledQueryFn<string>();
            await cacheError(new Error("cached failure"));

            const promise = controller.fetchQuery({ queryKey: QUERY_KEY, queryFn, refetchOnError: true });
            await flush();
            controller.cancelActiveFetch();

            await expect(promise).rejects.toBeInstanceOf(CancelledError);
            expect(calls[0].signal.aborted).toBe(true);
        });

        test("aborts the background refresh of staleWhileRevalidate", async () => {
            const { queryFn, calls } = makeControlledQueryFn<string>();
            queryClient.setQueryData(QUERY_KEY, "stale");

            const promise = controller.fetchQuery({
                queryKey: QUERY_KEY,
                queryFn,
                staleTime: 0,
                staleWhileRevalidate: true,
            });
            await expect(promise).resolves.toBe("stale");
            await flush();
            controller.cancelActiveFetch();

            expect(calls[0].signal.aborted).toBe(true);
            expect(queryClient.getQueryData(QUERY_KEY)).toBe("stale");
        });

        test("leaves settled calls alone", async () => {
            const { queryFn, calls } = makeControlledQueryFn<string>();

            const promise = controller.fetchQuery({ queryKey: QUERY_KEY, queryFn });
            await flush();
            calls[0].deferred.resolve("data");
            await promise;
            controller.cancelActiveFetch();

            await expect(promise).resolves.toBe("data");
            expect(calls[0].signal.aborted).toBe(false);
            expect(queryClient.getQueryData(QUERY_KEY)).toBe("data");
        });
    });
});
