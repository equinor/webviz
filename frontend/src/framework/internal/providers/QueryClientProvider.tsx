import React from "react";

import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { Provider } from "jotai";

import { AuthState, useAuthProvider } from "./AuthProvider";

import { HydrateQueryClientAtom } from "../components/HydrateQueryClientAtom";

type QueryError = {
    url: string;
    status: number;
    statusText: string;
    body: unknown;
    request: unknown;
    name: string;
};

export const CustomQueryClientProvider: React.FC<{ children: React.ReactElement }> = (props) => {
    const authProvider = useAuthProvider();

    const queryClient = React.useRef<QueryClient>(
        new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
                    refetchOnWindowFocus: false,
                    refetchOnMount: false,
                    refetchOnReconnect: true,
                    gcTime: 1000 * 60, // 1 minute
                    staleTime: 1000 * 60, // 1 minute
                },
            },
            queryCache: new QueryCache({
                onError: (error) => {
                    if (error && (error as unknown as QueryError).status === 401) {
                        authProvider.setAuthState(AuthState.NotLoggedIn);
                    }
                },
            }),
        })
    );

    return (
        <QueryClientProvider client={queryClient.current}>
            <Provider>
                <HydrateQueryClientAtom>{props.children}</HydrateQueryClientAtom>
            </Provider>
            <ReactQueryDevtools initialIsOpen={false} key="react-query-devtools" />
        </QueryClientProvider>
    );
};
