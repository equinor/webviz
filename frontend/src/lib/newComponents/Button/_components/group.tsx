import { LayoutClassProps } from "@lib/newComponents/_shared/wrapperProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import React from "react";

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
            className={resolveClassNames(layoutClassName, "flex items-center", { "gap-px": props.split })}
            {...rest}
        >
            {children}
        </div>
    );
});
