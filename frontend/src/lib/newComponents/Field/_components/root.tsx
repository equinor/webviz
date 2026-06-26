import React from "react";

import type { FieldRootProps as FieldRootBaseProps } from "@base-ui/react";
import { Field as FieldBase } from "@base-ui/react";

import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { FieldStateContext } from "./FieldStateContext";

export type RootProps = ComponentWrapperProps<FieldRootBaseProps> & {
    /** When true, uses `display: contents` so the field integrates into a parent grid layout. @default false */
    inline?: boolean;
    /** When true, applies warning styling and state to the field. @default false */
    warning?: boolean;
};

export const Root = React.forwardRef<HTMLDivElement, RootProps>(function Root(props, ref) {
    const baseProps = resolveWrapperProps(props, "inline", "warning");

    const fieldState = React.useMemo(
        () => ({ invalid: !!props.invalid, hasWarning: !!props.warning }),
        [props.invalid, props.warning],
    );

    return (
        <FieldStateContext.Provider value={fieldState}>
            <FieldBase.Root
                {...baseProps}
                ref={ref}
                data-warning={props.warning || undefined}
                className={resolveClassNames(baseProps.className, props.inline ? "contents" : "gap-y-xs flex flex-col")}
            >
                {props.children}
            </FieldBase.Root>
        </FieldStateContext.Provider>
    );
});
