import React from "react";
import { createRoot } from "react-dom/client";

import { client } from "@api";
import { AuthProvider } from "@framework/internal/providers/AuthProvider";
import { CustomQueryClientProvider } from "@framework/internal/providers/QueryClientProvider";
import { GlobalLog } from "@lib/utils/GlobalLog";

import App from "./App";
import { GlobalErrorBoundary } from "./GlobalErrorBoundary";

/*
    If the `cleanStart` query parameter is given, 
    the application will clear all local storage before rendering the application.
*/
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has("cleanStart")) {
    localStorage.clear();
    urlParams.delete("cleanStart");
    window.location.search = urlParams.toString();
}

// --------------------------------------------------------------------

/*
    Initialize the HTTP client.
*/

client.setConfig({
    withCredentials: true,
    baseURL: "/api",
});

// --------------------------------------------------------------------

/*
    Initialize the global log.
*/

// @ts-expect-error - log is not defined in globalThis
globalThis.log = GlobalLog;

// --------------------------------------------------------------------

/*
    Render the application.
*/

const container = document.getElementById("root");

if (!container) {
    throw new Error("Could not find root container");
}

const root = createRoot(container);

root.render(
    <React.StrictMode>
        <GlobalErrorBoundary>
            <AuthProvider>
                <CustomQueryClientProvider>
                    <App />
                </CustomQueryClientProvider>
            </AuthProvider>
        </GlobalErrorBoundary>
    </React.StrictMode>
);
