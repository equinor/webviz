import { queryOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import type { Options } from "./autogen";

export const ALLOW_WARNINGS_REQUEST_HEADER = "Webviz-Allow-Warnings";
export const WARNINGS_RESPONSE_HEADER = "Webviz-Content-Warnings";

export type DataWithWarnings<TData> = {
    value: TData;
    warnings: string[];
};

type SdkFunction<TOptions, TData> = (
    options: TOptions & { throwOnError: true },
) => PromiseLike<{ data: TData; headers: unknown }>;

function parseWarnings(headers: unknown): string[] {
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
 * Creates query options for a generated SDK function that tells the back-end that warnings are allowed,
 * and returns the data together with any warnings reported by the back-end.
 *
 * @param sdkFunction Generated SDK function, e.g. `getVectorList`
 * @param queryKeyFunction Generated query key function matching the SDK function, e.g. `getVectorListQueryKey`
 * @param options Options for the SDK function
 */
export function withWarnings<TOptions extends Options<any>, TData, TQueryKey extends readonly unknown[]>(
    sdkFunction: SdkFunction<TOptions, TData>,
    queryKeyFunction: (options: TOptions) => TQueryKey,
    options: TOptions,
) {
    const optionsWithHeader = {
        ...options,
        headers: { ...options.headers, [ALLOW_WARNINGS_REQUEST_HEADER]: "true" },
    } as TOptions;

    return queryOptions<DataWithWarnings<TData>, AxiosError, DataWithWarnings<TData>, TQueryKey>({
        queryKey: queryKeyFunction(optionsWithHeader),
        queryFn: async ({ signal }) => {
            const result = await sdkFunction({ ...optionsWithHeader, signal, throwOnError: true });
            return { value: result.data, warnings: parseWarnings(result.headers) };
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
