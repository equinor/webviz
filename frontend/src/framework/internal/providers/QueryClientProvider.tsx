import React from "react";

import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { AuthState, useAuthProvider } from "./AuthProvider";

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
                    cacheTime: 0,
                },
            },
            queryCache: new QueryCache({
                onError: async (error) => {
                    if (error && (error as QueryError).status === 401) {
                        authProvider.setAuthState(AuthState.NotLoggedIn);
                    }
                },
            }),
        })
    );

    return (
        <QueryClientProvider client={queryClient.current}>
            {props.children}
            <ReactQueryDevtools initialIsOpen={false} key="react-query-devtools" />
        </QueryClientProvider>
    );
};
