import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { ComponentWrapperProps } from "../_shared/utils/wrapperProps";
import { resolveWrapperProps } from "../_shared/utils/wrapperProps";

export type CodeProps = ComponentWrapperProps<React.HTMLAttributes<HTMLDivElement>>;

export const Code = React.forwardRef<HTMLDivElement, CodeProps>(function CodeComponent(props, ref) {
    const { children, ...restProps } = props;
    const baseProps = resolveWrapperProps(restProps);

    return (
        <div
            ref={ref}
            {...baseProps}
            className={resolveClassNames(
                props.layoutClassName,
                "bg-neutral p-horizontal-md py-vertical-sm flex flex-col rounded",
            )}
        >
            <div className="min-h-0 flex-1 overflow-auto">
                <pre className="wrap-break-word whitespace-pre-wrap">{children}</pre>
            </div>
        </div>
    );
});
