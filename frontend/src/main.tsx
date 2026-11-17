import React from "react";

import { createRoot } from "react-dom/client";

import { client } from "@api";
import { installAuthInterceptors } from "@framework/internal/auth/authInterceptors";
import { AuthState, AuthStateStore } from "@framework/internal/auth/AuthStateStore";
import { CustomQueryClientProvider } from "@framework/internal/providers/QueryClientProvider";
import { toastManager } from "@framework/toastManager";
import { Toast } from "@lib/components/Toast";

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

const authStateStore = AuthStateStore.getInstance();
installAuthInterceptors(client.instance, {
    isLoggedIn: () => authStateStore.isLoggedIn(),
    onUnauthorized: () => authStateStore.setAuthState(AuthState.NotLoggedIn),
});
authStateStore.fetchLoggedInUser();

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
        {/* Toast might be used in the error boundary fallback. We assume that the toast comp is very unlikely to crash, so we keep it outside */}
        <Toast toastManager={toastManager} />
        <GlobalErrorBoundary>
            <CustomQueryClientProvider>
                <App />
            </CustomQueryClientProvider>
        </GlobalErrorBoundary>
    </React.StrictMode>,
);
