import React from "react";

import type { LayoutClassProps } from "@lib/newComponents/_shared/utils/wrapperProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { ButtonProps } from "./button";

export type GroupProps = LayoutClassProps & {
    /** The Button elements to render in the group. */
    children: React.ReactElement<ButtonProps>[];
    /** When true, adds a small gap between buttons instead of merging their borders. */
    split?: boolean;
    /** Overrides the size of all buttons in the group. */
    size?: ButtonProps["size"];
};

export const Group = React.forwardRef<HTMLDivElement, GroupProps>(function Group(props, ref) {
    const { children, layoutClassName, split, ...rest } = props;
    return (
        <div
            ref={ref}
            data-group
            className={resolveClassNames(layoutClassName, "group/button-group flex items-center", {
                "gap-x-px": split,
            })}
            {...rest}
        >
            {React.Children.map(children, (child) => {
                if (!React.isValidElement(child)) return null;
                return React.cloneElement(child, { size: props.size, ...child.props });
            })}
        </div>
    );
});
