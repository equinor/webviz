import { Options, RequestResult } from "@hey-api/client-axios";
import { QueryFunctionContext, queryOptions } from "@tanstack/react-query";

import { client } from "./autogen";

interface DataShape {
    body?: unknown | undefined;
    headers?: unknown | undefined;
    path?: unknown | undefined;
    query?: unknown | undefined;
    url: string;
}

export type ApiFunction<TData extends DataShape, TResponseData> = (
    options: Options<TData, true>
) => RequestResult<TResponseData>;

type QueryKey<TOptions extends Options> = [
    Pick<TOptions, "baseURL" | "body" | "headers" | "path" | "query"> & {
        _id: string;
        _infinite?: boolean;
    }
];

const createQueryKey = <TOptions extends Options>(
    id: string,
    options?: TOptions,
    infinite?: boolean
): QueryKey<TOptions>[0] => {
    const params: QueryKey<TOptions>[0] = {
        _id: id,
        baseURL: (options?.client ?? client).getConfig().baseURL,
    } as QueryKey<TOptions>[0];
    if (infinite) {
        params._infinite = infinite;
    }
    if (options?.body) {
        params.body = options.body;
    }
    if (options?.headers) {
        params.headers = options.headers;
    }
    if (options?.path) {
        params.path = options.path;
    }
    if (options?.query) {
        params.query = options.query;
    }
    return params;
};

export type AllowWarningsReturnType<TData extends DataShape, TReturnData, TQueryKey = QueryKey<Options<TData>>> = {
    queryFn?: (
        context: QueryFunctionContext<QueryKey<Options<TData>>>
    ) => Promise<{ data: TReturnData; warnings: any }>;
    queryKey?: TQueryKey;
};

export function withWarnings<TData extends DataShape, TReturnData>(
    apiFunction: <ThrowOnError extends boolean = true>(
        options: Options<TData, ThrowOnError>
    ) => RequestResult<TReturnData, any, ThrowOnError>,
    options: Options<TData>
) {
    return queryOptions({
        queryFn: async ({ signal }) => {
            const result = await apiFunction<true>({
                ...options,
                headers: {
                    ...options.headers,
                    "Webviz-Allow-Warnings": "true",
                },
                throwOnError: true,
                signal,
            });

            const warnings = JSON.parse(result.headers["webviz-content-warnings"]);

            return { data: result.data, warnings };
        },
        queryKey: [createQueryKey(apiFunction.name, options)],
    });
}
