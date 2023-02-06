import React from "react";
import { QueryClient, QueryClientProvider, setLogger } from "react-query";

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
    setLogger({
        log: () => {},
        warn: () => {},
        error: () => {},
    });

    return <QueryClientProvider client={queryClient}>{props.children}</QueryClientProvider>;
};
