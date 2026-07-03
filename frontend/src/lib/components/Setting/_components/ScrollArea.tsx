import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type ScrollAreaProps = {
    children?: React.ReactNode;
    className?: string;
};

export const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(function ScrollArea(props, ref) {
    return (
        <div
            ref={ref}
            data-collapsible-scroll-area
            className={resolveClassNames(
                props.className,
                "group/scrollarea relative h-full min-h-0 w-full overflow-auto",
            )}
        >
            {props.children}
            <div className="h-24" />
        </div>
    );
});
