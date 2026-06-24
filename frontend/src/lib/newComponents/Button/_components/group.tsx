import React from "react";

import { ComponentSizeContext, useComponentSize } from "@lib/newComponents/_shared/contexts/componentSizeContext";
import { resolveWrapperProps, type LayoutClassProps } from "@lib/newComponents/_shared/utils/wrapperProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { ButtonProps } from "./button";

export type GroupProps = LayoutClassProps & {
    /** The Button elements to render in the group. */
    children: React.ReactElement<ButtonProps>[];
    /** When true, adds a small gap between buttons instead of merging their borders. @default false */
    split?: boolean;
    /** Overrides the size of all buttons in the group. */
    size?: ButtonProps["size"];
};

export const Group = React.forwardRef<HTMLDivElement, GroupProps>(function Group(props, ref) {
    const size = useComponentSize(props);
    const baseProps = resolveWrapperProps(props, "children", "split", "size");

    return (
        <div
            {...baseProps}
            ref={ref}
            data-group
            className={resolveClassNames(baseProps.className, "group/button-group flex items-center", {
                "gap-x-px": props.split,
            })}
        >
            <ComponentSizeContext.Provider value={size}>{props.children}</ComponentSizeContext.Provider>
        </div>
    );
});
