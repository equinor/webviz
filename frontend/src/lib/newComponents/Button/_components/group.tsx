import React from "react";

import type { LayoutClassProps } from "@lib/newComponents/_shared/wrapperProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type GroupProps = LayoutClassProps & {
    children: React.ReactNode;
    split?: boolean;
};

export const Group = React.forwardRef<HTMLDivElement, GroupProps>(function Group(props, ref) {
    const { children, layoutClassName, ...rest } = props;
    return (
        <div
            ref={ref}
            data-group
            className={resolveClassNames(layoutClassName, "flex items-center", { "gap-x-px": props.split })}
            {...rest}
        >
            {children}
        </div>
    );
});
