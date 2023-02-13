import React from "react";
import { QueryClient, QueryClientProvider } from "react-query";
import { ReactQueryDevtools } from "react-query/devtools";

export const CustomQueryClientProvider: React.FC<{ children: React.ReactElement }> = (props) => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                refetchOnWindowFocus: false,
                refetchOnMount: false,
                refetchOnReconnect: true,
                cacheTime: 0,
            },
        },
    });

    return (
        <QueryClientProvider client={queryClient}>
            {props.children}
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    );
};
