import React from "react";

import { createPortal } from "@lib/utils/createPortal";

export type ScrimProps = {
    /** When true, the scrim is hidden. @default false */
    hidden?: boolean;
};

export const Scrim = React.forwardRef<HTMLDivElement, ScrimProps>(function Scrim(props, ref) {
    return createPortal(
        <div
            ref={ref}
            className="z-overlay bg-backdrop fixed inset-0"
            style={{ display: props.hidden ? "none" : "block" }}
        />,
    );
});
