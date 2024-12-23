import React from "react";

import { MultipartPart, parseMultipart } from "@mjackson/multipart-parser";
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { Buffer } from "buffer";
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
                    gcTime: 0,
                    select: async (data: unknown) => {
                        if (typeof data !== "string") {
                            return data;
                        }
                        try {
                            const buffer = Buffer.from(data, "utf8");
                            const arr = new Uint8Array(buffer);
                            const parts: MultipartPart[] = [];
                            for await (let part of parseMultipart(arr, "----WebKitFormBoundary7MA4YWxkTrZu0gW")) {
                                parts.push(part);
                            }
                            const text = await parts[0].text();
                            const json = JSON.parse(text);
                            return json;
                        } catch (e) {
                            console.error("Failed to parse multipart data", e);
                            return data;
                        }
                    },
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
