import React from "react";

import { Description } from "@mui/icons-material";

// Custom drag image (a generic document icon, rather than the tiny drag handle icon itself) used
// via dataTransfer.setDragImage in the reorder hook's drag-start handler. Rendered off-screen
// since it only needs to exist as a DOM node for the browser to snapshot.
export const DashboardDragImage = React.forwardRef<HTMLDivElement>(function DashboardDragImage(_props, ref) {
    return (
        <div
            ref={ref}
            className="bg-surface border-neutral-subtle text-accent-strong pointer-events-none fixed flex h-6 w-6 items-center justify-center rounded border shadow"
            style={{ left: -9999, top: 0 }}
            aria-hidden
        >
            <Description fontSize="small" />
        </div>
    );
});
