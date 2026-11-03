import React from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Provider } from "jotai";

import { tanstackDebugTimeOverride } from "@framework/utils/debug";

import { HydrateQueryClientAtom } from "../components/HydrateQueryClientAtom";

export const CustomQueryClientProvider: React.FC<{ children: React.ReactElement }> = (props) => {
    const queryClientRef = React.useRef<QueryClient>(
        new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
                    refetchOnWindowFocus: false,
                    refetchOnMount: false,
                    refetchOnReconnect: true,
                    gcTime: tanstackDebugTimeOverride(1000 * 60), // 1 minute
                    staleTime: tanstackDebugTimeOverride(1000 * 60), // 1 minute
                },
            },
        }),
    );

    return (
        <QueryClientProvider client={queryClientRef.current}>
            <Provider>
                <HydrateQueryClientAtom>{props.children}</HydrateQueryClientAtom>
            </Provider>
            <ReactQueryDevtools initialIsOpen={false} key="react-query-devtools" />
        </QueryClientProvider>
    );
};
