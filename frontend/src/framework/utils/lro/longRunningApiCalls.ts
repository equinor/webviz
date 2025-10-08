import React from "react";

import type { RequestResult } from "@hey-api/client-axios";
import type { QueryFunctionContext } from "@tanstack/query-core";
import type { UseQueryOptions } from "@tanstack/react-query";
import { hashKey } from "@tanstack/react-query";
import { AxiosError } from "axios";

import type { LroFailureResp_api, LroInProgressResp_api, HttpValidationError_api } from "@api";
import { client } from "@api";
import { lroProgressBus } from "@framework/LroProgressBus";

import type { BackoffStrategy } from "./backoffStrategies/BackoffStrategy";
import { FixedBackoffStrategy } from "./backoffStrategies/FixedBackoffStrategy";

export class LroError extends Error {
    payload: unknown | undefined;
    code: string | number | undefined;

    constructor(message: string, payload?: unknown, code?: string | number, options?: { cause?: unknown }) {
        super(message, options as any);
        this.payload = payload;
        this.code = code;
        this.name = "LroError";
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

/**
 * Wraps a long-running query function to handle polling and progress updates.
 *
 * @param options - The options for the long-running query. Consisting of:
 * - queryFn: The query function to execute the long-running operation.
 * - queryFnArgs: The arguments to pass to the query function.
 * - queryKey: The query key to use for React Query.
 * - delayBetweenPollsSecs: The delay between polling attempts in seconds. Default is 1 second.
 * - maxTotalDurationSecs: The maximum total duration to poll before timing out in seconds. Default is 60 seconds.
 * @returns
 */
export function wrapLongRunningQuery<TArgs, TData, TQueryKey extends readonly unknown[]>({
    queryFn,
    queryFnArgs,
    queryKey,
    delayBetweenPollsSecs = 1,
    maxTotalDurationSecs = 60,
}: WrapLongRunningQueryArgs<TArgs, TData> & { queryKey: TQueryKey }): UseQueryOptions<TData, Error, TData, TQueryKey> {
    const busKey = hashKey(queryKey);

    return {
        queryKey,
        meta: {
            lroBusKey: busKey,
        },
        queryFn: async (ctx: QueryFunctionContext<TQueryKey>) => {
            const signal = ctx.signal;

            try {
                const response = await queryFn({ ...queryFnArgs, signal, throwOnError: false });

                if (response.error) {
                    lroProgressBus.remove(busKey);
                    const axiosError = new AxiosError(
                        response.message,
                        response.code,
                        response.config,
                        response.request,
                        response.response,
                    );
                    throw new LroError("Initial request failed", undefined, response.code, { cause: axiosError });
                }

                const data = response.data;

                if (data.status === "success") {
                    lroProgressBus.remove(busKey);
                    if (data.result === undefined) {
                        throw new LroError("Missing result in successful response", data);
                    }
                    return data.result;
                }

                if (data.status === "failure") {
                    lroProgressBus.remove(busKey);
                    throw new LroError(data.error?.message || "Unknown LRO error", data, (data as any)?.error?.code);
                }

                if (data.status === "in_progress" && data.task_id) {
                    lroProgressBus.publish(busKey, data.progress_message ?? null);

                    return pollUntilDone<TData>({
                        busKey,
                        pollResource: data.poll_url
                            ? {
                                  resourceType: "url",
                                  url: data.poll_url,
                                  taskId: data.task_id,
                              }
                            : {
                                  resourceType: "queryFn",
                                  queryFn,
                                  options: { ...queryFnArgs },
                              },
                        delayBetweenPollsSecs,
                        maxTotalDurationSecs,
                        signal,
                        taskId: data.task_id,
                    });
                }

                lroProgressBus.remove(busKey);
                throw new LroError("Invalid response status or missing poll_url", data);
            } catch (e) {
                lroProgressBus.remove(busKey);
                if (signal?.aborted) {
                    if (!(e instanceof DOMException && e.name === "AbortError")) {
                        throw new DOMException("Aborted", "AbortError");
                    }
                }
                throw e;
            }
        },
    };
}

/*
 * A hook to subscribe to long-running operation progress messages.
 * It uses the LroProgressBus to get the last progress message for the given query key.
 * The optional callback is called whenever the progress message changes.
 */
export function useLroProgress(
    queryKey: readonly unknown[],
    callback?: (message: string | null) => void,
): string | null {
    const serializedKey = hashKey(queryKey);
    const prevProgressMessage = React.useRef<string | null>(null);
    const getSnapshot = React.useCallback(() => lroProgressBus.getLast(serializedKey) ?? null, [serializedKey]);

    const progressMessage = React.useSyncExternalStore(
        (onStoreChange) => lroProgressBus.subscribe(serializedKey, onStoreChange),
        getSnapshot,
        getSnapshot,
    );

    React.useEffect(
        function maybeCallCallbackOnMessageChange() {
            if (progressMessage !== prevProgressMessage.current) {
                callback?.(progressMessage);
                prevProgressMessage.current = progressMessage;
            }
        },
        [progressMessage, callback],
    );

    return progressMessage;
}

type LongRunningApiResponse<TData> =
    | LroInProgressResp_api
    | LroFailureResp_api
    | {
          status: "success";
          result: TData;
      };

type QueryFn<TArgs, TData> = (
    options: TArgs,
) => RequestResult<LongRunningApiResponse<TData>, LroFailureResp_api | HttpValidationError_api, false>;
interface WrapLongRunningQueryArgs<TArgs, TData> {
    queryFn: QueryFn<TArgs, TData>;
    queryFnArgs: TArgs;
    queryKey: unknown[];
    delayBetweenPollsSecs?: number;
    maxTotalDurationSecs?: number;
}

type PollResource<TArgs, TData> =
    | {
          resourceType: "url";
          url: string;
          taskId: string;
      }
    | {
          resourceType: "queryFn";
          queryFn: QueryFn<TArgs, TData>;
          options: TArgs;
      };

async function pollUntilDone<T>(options: {
    busKey: string;
    // The URL to poll for the long-running operation status or the original query function if polled from same endpoint
    pollResource: PollResource<any, T>;
    // Not used yet, but possibly required for canceling in the future
    taskId: string;
    delayBetweenPollsSecs: number;
    maxTotalDurationSecs: number;
    signal?: AbortSignal;
    delayStrategy?: BackoffStrategy;
}): Promise<T> {
    const {
        pollResource,
        delayBetweenPollsSecs,
        maxTotalDurationSecs,
        signal,
        delayStrategy = new FixedBackoffStrategy(delayBetweenPollsSecs * 1000),
    } = options;

    let attempt = 0;
    let lastProgressMessage: string | null = null;

    const startTime = Date.now();
    const maxDurationMs = maxTotalDurationSecs * 1000;

    function wait(progressChanged: boolean): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const delayMs = delayStrategy.nextBackoffMs({
                attempt,
                baseDelayMs: delayBetweenPollsSecs * 1000,
                // How do we want to set maxDelayMs?
                maxDelayMs: delayBetweenPollsSecs * 1000 * 20,
                progressChanged,
            });

            const timeout = setTimeout(() => {
                signal?.removeEventListener("abort", onAbort);
                resolve();
            }, delayMs);

            function onAbort() {
                clearTimeout(timeout);
                reject(new DOMException("Polling aborted during wait", "AbortError"));
            }

            if (signal?.aborted) {
                return onAbort();
            }

            signal?.addEventListener("abort", onAbort, { once: true });
        });
    }

    let currentPollUrl: string | null = pollResource.resourceType === "url" ? pollResource.url : null;

    try {
        while (Date.now() - startTime < maxDurationMs) {
            if (signal?.aborted) {
                throw new DOMException("Aborted", "AbortError");
            }

            let response: Awaited<
                RequestResult<LongRunningApiResponse<T>, LroFailureResp_api | HttpValidationError_api, false>
            > | null = null;

            if (pollResource.resourceType === "url" && currentPollUrl) {
                // If pollResource is a URL, use it directly
                response = await client.get<
                    LongRunningApiResponse<T>,
                    LroFailureResp_api | HttpValidationError_api,
                    false
                >({
                    url: currentPollUrl,
                    signal,
                });
            } else if (pollResource.resourceType === "queryFn") {
                // If pollResource is a function, call it with the operationId
                response = await pollResource.queryFn({
                    ...pollResource.options,
                    signal,
                    throwOnError: false,
                });
            }

            if (!response) {
                throw new LroError("No response received from polling");
            }

            const { data, error } = response;

            if (error) {
                const axiosError = new AxiosError(
                    response.message,
                    response.code,
                    response.config,
                    response.request,
                    response.response,
                );
                throw new LroError("Polling request failed", undefined, response.code, { cause: axiosError });
            }

            if (data.status === "success") {
                return data.result as T;
            }

            if (data.status === "failure") {
                throw new LroError(data.error?.message || "Unknown LRO error", data, (data as any).error?.code);
            }

            if (data.status === "in_progress") {
                const progress = data.progress_message ?? null;
                const progressChanged = progress !== lastProgressMessage;

                if (progressChanged) {
                    attempt = 0;
                    lastProgressMessage = progress;
                } else {
                    attempt++;
                }

                if (pollResource.resourceType === "url") {
                    if (!data.poll_url) {
                        throw new LroError("Expecting poll url to be present", data, (data as any).error?.code);
                    }
                    currentPollUrl = data.poll_url;
                }

                lroProgressBus.publish(options.busKey, data.progress_message ?? null);

                await wait(progressChanged);
                continue;
            }

            throw new LroError("Unexpected response status", data);
        }

        throw new LroError("Polling timed out");
    } finally {
        lroProgressBus.remove(options.busKey);
    }
}
