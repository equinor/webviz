import type React from "react";

import ReactDOM from "react-dom";

export function createPortal(children: React.ReactNode, key?: string | null | undefined) {
    const container = document.getElementById("portal-root");

    if (!container) {
        throw new Error("Could not find portal container");
    }

    return ReactDOM.createPortal(children, container, key);
}
