import React from "react";

import { createRoot } from "react-dom/client";
import { ToastContainer } from "react-toastify";

import { client } from "@api";

import { LibSandbox } from "./libSandbox";
// import { AuthProvider } from "@framework/internal/providers/AuthProvider";
// import { CustomQueryClientProvider } from "@framework/internal/providers/QueryClientProvider";

// import App from "../App";
// import { GlobalErrorBoundary } from "../GlobalErrorBoundary";

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
    Render the application.
*/

const container = document.getElementById("root");

if (!container) {
    throw new Error("Could not find root container");
}

const root = createRoot(container);

root.render(
    <React.StrictMode>
        <ToastContainer limit={3} position="bottom-right" />
        <div className="bg-gray-100">
            <div className="bg-white max-w-6xl min-h-svh mx-auto px-4 py-2">
                <LibSandbox />
            </div>
        </div>
    </React.StrictMode>,
);
