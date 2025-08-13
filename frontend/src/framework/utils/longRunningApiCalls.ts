import type { LroFailureResp_api, LroInProgressResp_api, HttpValidationError_api } from "@api";
import { client } from "@api";
import type { RequestResult } from "@hey-api/client-axios";
import type { QueryFunctionContext } from "@tanstack/query-core";
import type { UseQueryOptions } from "@tanstack/react-query";
import { AxiosError } from "axios";

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

interface OnProgressCallback {
    (progressMessage: string | null): void;
}

interface WrapLongRunningQueryArgs<TArgs, TData> {
    queryFn: QueryFn<TArgs, TData>;
    queryFnArgs: TArgs;
    queryKey: unknown[];
    pollIntervalMs?: number;
    maxRetries?: number;
    onProgress?: OnProgressCallback;
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
    // The URL to poll for the long-running operation status or the original query function if polled from same endpoint
    pollResource: PollResource<any, T>;
    taskId: string;
    intervalMs: number;
    maxRetries: number;
    signal?: AbortSignal;
    onProgress?: OnProgressCallback;
}): Promise<T> {
    const { pollResource, intervalMs, maxRetries, signal, onProgress } = options;
    let currentPollUrl: string | null = pollResource.resourceType === "url" ? pollResource.url : null;

    for (let i = 0; i < maxRetries; i++) {
        if (signal?.aborted) {
            throw new Error("Polling aborted");
        }

        let response: Awaited<
            RequestResult<LongRunningApiResponse<T>, LroFailureResp_api | HttpValidationError_api, false>
        > | null = null;

        if (pollResource.resourceType === "url" && currentPollUrl) {
            // If pollResource is a URL, use it directly
            response = await client.get<LongRunningApiResponse<T>, LroFailureResp_api | HttpValidationError_api, false>({
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
            throw new Error("No response received from polling");
        }

        const { data, error } = response;

        if (error) {
            throw new AxiosError(response.message, response.code, response.config, response.request, response.response);
        }

        if (data.status === "success") {
            return data.result as T;
        } else if (data.status === "failure") {
            throw new Error(data.error?.message || "Unknown error");
        }

        if (data.status === "in_progress") {
            if (pollResource.resourceType === "url") {
                if (!data.poll_url) {
                    throw new Error("Missing poll_url in in_progress response");
                }
                currentPollUrl = data.poll_url;
            }
            onProgress?.(data.progress_message ?? null);
        }

        await new Promise<void>((resolve, reject) => {
            function onAbort() {
                clearTimeout(timeout);
                reject(new Error("Polling aborted during wait"));
            }

            function onTimeout() {
                signal?.removeEventListener("abort", onAbort);
                resolve();
            }

            const timeout = setTimeout(onTimeout, intervalMs);
            signal?.addEventListener("abort", onAbort, { once: true });
        });
    }

    throw new Error("Polling timed out");
}

export function wrapLongRunningQuery<TArgs, TData, TQueryKey extends readonly unknown[]>({
    queryFn,
    queryFnArgs,
    queryKey,
    pollIntervalMs = 2000,
    maxRetries = 50,
    onProgress,
}: WrapLongRunningQueryArgs<TArgs, TData> & { queryKey: TQueryKey }): UseQueryOptions<TData, Error, TData, TQueryKey> {
    return {
        queryKey,
        queryFn: async (ctx: QueryFunctionContext<TQueryKey>) => {
            const signal = ctx.signal;

            const response = await queryFn({ ...queryFnArgs, signal, throwOnError: false });
            const { data, error } = response;

            if (error) {
                throw new AxiosError(
                    response.message,
                    response.code,
                    response.config,
                    response.request,
                    response.response,
                );
            }

            if (data.status === "success") {
                if (data.result === undefined) {
                    throw new Error("Missing result in successful response");
                }
                return data.result;
            } else if (data.status === "in_progress" && data.task_id) {
                onProgress?.(data.progress_message ?? null);
                return pollUntilDone<TData>({
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
                    intervalMs: pollIntervalMs,
                    maxRetries,
                    signal,
                    onProgress,
                    taskId: data.task_id,
                });
            }
            if (data.status === "failure") {
                throw new Error(data.error?.message || "Unknown error");
            }

            throw new Error("Invalid response status or missing poll_url");
        },
    };
}
