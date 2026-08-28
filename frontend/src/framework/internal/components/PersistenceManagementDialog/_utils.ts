import { useInfiniteQuery } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import type {
    SortDirection_api,
    GetSessionsMetadataData_api,
    GetSessionsMetadataError_api,
    GetSessionsMetadataResponse_api,
    Options,
} from "@api";
import { getSessionsMetadata } from "@api";
import type { SortDirection as TableSortDirection } from "@lib/components/Table/typesAndEnums";

import { QUERY_PAGE_SIZE } from "./constants";

export function tableSortDirToApiSortDir(sort: TableSortDirection): SortDirection_api {
    return sort as unknown as SortDirection_api;
}

export function useInfiniteSessionMetadataQuery(
    querySortParams: Options<GetSessionsMetadataData_api>["query"],
    enabled?: boolean,
) {
    // ! We need to manually write out the query because hey-api generates keys in a way that messes with Tanstack's
    // ! ability to set query data (which we use after mutating metadata).
    // ! You'd think this would work, but if I try this; the data never loads, because it tries to get the query
    // ! params from the key...
    // return useInfiniteQuery({
    //     ...getSessionsMetadataInfiniteOptions({
    //         query: {
    //             ...querySortParams,
    //             limit: QUERY_PAGE_SIZE,
    //             // // TODO: Rename `cursor` to `continuation_token` once we update to latest hey-api version
    //             // cursor: pageParam,
    //         },
    //     }),
    //     queryKey: [
    //         // @ts-expect-error -- Ignore expected tanstack key type
    //         "getSessionsMetadata",
    //         "infinite",
    //         querySortParams?.filter_title,
    //         querySortParams?.filter_updated_from,
    //         querySortParams?.filter_updated_to,
    //         querySortParams?.sort_by,
    //         querySortParams?.sort_direction,
    //     ],
    //     initialPageParam: null,
    //     refetchInterval: 20000,
    //     getNextPageParam(lastPage) {
    //         return lastPage.continuation_token;
    //     },
    // });

    return useInfiniteQuery<
        GetSessionsMetadataResponse_api,
        AxiosError<GetSessionsMetadataError_api>,
        InfiniteData<GetSessionsMetadataResponse_api>,
        readonly unknown[],
        string | null
    >({
        queryKey: [
            "getSessionsMetadata",
            "infinite",
            querySortParams?.filter_title,
            querySortParams?.filter_updated_from,
            querySortParams?.filter_updated_to,
            querySortParams?.sort_by,
            querySortParams?.sort_direction,
        ],
        initialPageParam: null,
        refetchInterval: 20000,
        getNextPageParam(lastPage) {
            return lastPage.pageToken;
        },
        async queryFn({ pageParam, signal }) {
            const { data } = await getSessionsMetadata({
                signal,
                throwOnError: true,
                query: {
                    ...querySortParams,
                    page_size: QUERY_PAGE_SIZE,
                    // TODO: Rename `cursor` to `continuation_token` once we update to latest hey-api version
                    cursor: pageParam,
                },
            });

            await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate network latency for better UX when testing

            return data;
        },
        enabled,
    });
}
