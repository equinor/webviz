import React from "react";

import type { LayoutClassProps } from "@lib/newComponents/_shared/utils/wrapperProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { ButtonProps } from "./button";

export type GroupProps = LayoutClassProps & {
    children: React.ReactElement<ButtonProps>[];
    split?: boolean;
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
