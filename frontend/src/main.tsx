import React from "react";
import { createRoot } from "react-dom/client";

import { AuthProvider } from "@framework/internal/providers/AuthProvider";
import { CustomQueryClientProvider } from "@framework/internal/providers/QueryClientProvider";

import App from "./App";

const container = document.getElementById("root");

if (!container) {
    throw new Error("Could not find root container");
}

const root = createRoot(container);

root.render(
    <React.StrictMode>
        <AuthProvider>
            <CustomQueryClientProvider>
                <App />
            </CustomQueryClientProvider>
        </AuthProvider>
    </React.StrictMode>
);
