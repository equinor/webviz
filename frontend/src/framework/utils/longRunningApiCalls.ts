import { client, type HttpValidationError_api } from "@api";
import type { LroErrorResp_api, LroInProgressResp_api } from "@api";
import type { RequestResult } from "@hey-api/client-axios";
import type { QueryFunctionContext } from "@tanstack/query-core";
import type { UseQueryOptions } from "@tanstack/react-query";

type LongRunningApiResponse<TData> =
    | LroInProgressResp_api
    | LroErrorResp_api
    | {
          status: "success";
          data: TData;
      };

function isLongRunningApiErrorResponse(response: unknown): response is LroErrorResp_api {
    return response !== null && typeof response === "object" && "status" in response && response.status === "failure";
}

type QueryFn<TArgs, TData> = (
    options: TArgs,
) => RequestResult<LongRunningApiResponse<TData>, LroErrorResp_api | HttpValidationError_api, false>;

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
          operationId: string;
      }
    | {
          resourceType: "queryFn";
          queryFn: QueryFn<TArgs, TData>;
          options: TArgs;
      };

async function pollUntilDone<T>(options: {
    // The URL to poll for the long-running operation status or the original query function if polled from same endpoint
    pollResource: PollResource<any, T>;
    operationId: string;
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
            RequestResult<LongRunningApiResponse<T>, LroErrorResp_api | HttpValidationError_api, false>
        > | null = null;

        if (pollResource.resourceType === "url" && currentPollUrl) {
            // If pollResource is a URL, use it directly
            response = await client.get<LongRunningApiResponse<T>, LroErrorResp_api | HttpValidationError_api, false>({
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
            const errorResponse = response.response;
            if (errorResponse && errorResponse.data) {
                const errorData = errorResponse.data as HttpValidationError_api | LroErrorResp_api;
                if (isLongRunningApiErrorResponse(errorData)) {
                    throw new Error(errorData.error?.message || "Unknown error");
                }
            }
            throw error;
        }

        if (data.status === "success") {
            return data.data as T;
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
            const { data: result, error } = response;

            if (error) {
                const errorResponse = response.response;
                if (errorResponse && errorResponse.data) {
                    const errorData = errorResponse.data as HttpValidationError_api | LroErrorResp_api;
                    if (isLongRunningApiErrorResponse(errorData)) {
                        throw new Error(errorData.error?.message || "Unknown error");
                    }
                }
                throw error;
            }

            if (result.status === "success") {
                if (result.data === undefined) {
                    throw new Error("Missing data in successful response");
                }
                return result.data;
            } else if (result.status === "in_progress" && result.operation_id) {
                // ToDo: Verify with Ruben that it is OK to call onProgress here
                onProgress?.(result.progress_message ?? null);
                return pollUntilDone<TData>({
                    pollResource: result.poll_url
                        ? {
                              resourceType: "url",
                              url: result.poll_url,
                              operationId: result.operation_id,
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
                    operationId: result.operation_id,
                });
            }
            if (result.status === "failure") {
                throw new Error(result.error?.message || "Unknown error");
            }

            throw new Error("Invalid response status or missing poll_url");
        },
    };
}
