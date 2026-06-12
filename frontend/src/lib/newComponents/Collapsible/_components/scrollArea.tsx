import React from "react";

import type { LayoutClassProps } from "@lib/newComponents/_shared/utils/wrapperProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type ScrollAreaProps = LayoutClassProps & {
    children?: React.ReactNode;
};

export const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(function ScrollArea(props, ref) {
    return (
        <div
            ref={ref}
            data-collapsible-scroll-area
            className={resolveClassNames(
                props.layoutClassName,
                "group/scrollarea relative h-full min-h-0 w-full overflow-auto pb-12",
            )}
        >
            {props.children}
        </div>
    );
});
