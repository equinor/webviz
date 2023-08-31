import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type BaseComponentProps = {
    disabled?: boolean;
    children?: React.ReactNode;
};

export const BaseComponent = React.forwardRef((props: BaseComponentProps, ref: React.ForwardedRef<HTMLDivElement>) => {
    return (
        <div
            ref={ref}
            className={resolveClassNames({
                "opacity-50": props.disabled,
                "pointer-events-none": props.disabled,
                "cursor-default": props.disabled,
            })}
        >
            {props.children}
        </div>
    );
});

BaseComponent.displayName = "BaseComponent";
