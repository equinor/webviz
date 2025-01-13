import React from "react";
import { createRoot } from "react-dom/client";

import { client } from "@api";
import { AuthProvider } from "@framework/internal/providers/AuthProvider";
import { CustomQueryClientProvider } from "@framework/internal/providers/QueryClientProvider";

import App from "./App";
import { GlobalErrorBoundary } from "./GlobalErrorBoundary";
import { TempMovedToAmsterdamNotifier } from "./tempMoved/TempMovedToAmsterdamNotifier";

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

const container = document.getElementById("root");

if (!container) {
    throw new Error("Could not find root container");
}

const root = createRoot(container);

if (window.location.hostname === "webviz.app.radix.equinor.com") {
    root.render(
        <React.StrictMode>
            <TempMovedToAmsterdamNotifier />
        </React.StrictMode>
    );
} else {
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
}
