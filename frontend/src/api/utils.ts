import { queryOptions, type UseQueryOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import type { Options } from "./autogen";

export const ALLOW_WARNINGS_REQUEST_HEADER = "Webviz-Allow-Warnings";
export const WARNINGS_RESPONSE_HEADER = "Webviz-Content-Warnings";

export type DataWithWarnings<TData> = {
    value: TData;
    warnings: string[];
};

type SdkFunction<TData> = (options: any) => PromiseLike<{ data?: TData; headers?: unknown }>;

/** Parses the warnings from the response headers of an SDK call */
export function parseWarnings(headers: unknown): string[] {
    // Axios normalizes response header names to lower case
    const headerValue = (headers as Record<string, unknown> | undefined)?.[WARNINGS_RESPONSE_HEADER.toLowerCase()];
    if (typeof headerValue !== "string") {
        return [];
    }

    try {
        const parsed: unknown = JSON.parse(headerValue);
        return Array.isArray(parsed) ? parsed.filter((warning): warning is string => typeof warning === "string") : [];
    } catch {
        return [];
    }
}

/**
 * Creates query options that tell the back-end that warnings are allowed, and returns the data together
 * with any warnings reported by the back-end.
 *
 * The generated options function only returns the data of the response, so the matching SDK function
 * is also needed to get hold of the response headers.
 *
 * @param generatedOptions Result of a generated options function, e.g. `getVectorListOptions({ query: {...} })`
 * @param sdkFunction Generated SDK function matching the options function, e.g. `getVectorList`
 */
export function withWarnings<TData, TQueryKey extends [Options<any>]>(
    generatedOptions: UseQueryOptions<TData, any, any, TQueryKey>,
    sdkFunction: SdkFunction<TData>,
) {
    const [keyParams] = generatedOptions.queryKey as unknown as TQueryKey;
    const keyParamsWithHeader = {
        ...keyParams,
        headers: { ...keyParams.headers, [ALLOW_WARNINGS_REQUEST_HEADER]: "true" },
    };

    return queryOptions<DataWithWarnings<TData>, AxiosError, DataWithWarnings<TData>, TQueryKey>({
        queryKey: [keyParamsWithHeader] as unknown as TQueryKey,
        queryFn: async ({ signal }) => {
            const result = await sdkFunction({ ...keyParamsWithHeader, signal, throwOnError: true });
            return { value: result.data as TData, warnings: parseWarnings(result.headers) };
        },
    });
}

/**
 * Replaces the `DataWithWarnings` wrapper in the data of a query result with its plain value,
 * so consumers that are unaware of warnings can keep using the unwrapped data shape.
 */
export function unwrapQueryResultWarnings<TData, TQueryResult extends { data: DataWithWarnings<TData> | undefined }>(
    query: TQueryResult,
): Omit<TQueryResult, "data"> & { data: TData | undefined } {
    return { ...query, data: query.data?.value };
}

/** Get the warnings of a query result carrying `DataWithWarnings`, or an empty list if there is no data yet */
export function getQueryResultWarnings(query: { data: DataWithWarnings<unknown> | undefined }): string[] {
    return query.data?.warnings ?? [];
}
