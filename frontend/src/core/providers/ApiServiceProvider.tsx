import React from "react";

import { ApiService } from "@/api/ApiService";
import { makeUrl, urlToString } from "@/core/utils/url";

import { createGenericContext } from "../hooks/genericContext";

const [useApiServiceContext, ApiServiceProvider] = createGenericContext<ApiService>();

export const ApiServiceWrapper: React.FC<{ children: React.ReactElement }> = ({ children }) => {
    const apiConfig = {
        BASE: urlToString(
            makeUrl({
                hostname: "localhost",
                protocol: "http",
                port: 8000,
                pathname: "",
            })
        ),
        WITH_CREDENTIALS: true,
    };
    const apiService = new ApiService(apiConfig);

    return <ApiServiceProvider value={apiService}>{children}</ApiServiceProvider>;
};

export const useApiService = useApiServiceContext;
