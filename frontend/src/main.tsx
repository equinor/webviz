import React from "react";
import { createRoot } from "react-dom/client";

import App from "./App";

const container = document.getElementById("root");

if (!container) {
    throw new Error("Could not find root container");
}

const root = createRoot(container);

root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
