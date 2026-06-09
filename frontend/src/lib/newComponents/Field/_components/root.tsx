import React from "react";

import type { FieldRootProps as FieldRootBaseProps } from "@base-ui/react";
import { Field as FieldBase } from "@base-ui/react";

import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { FieldStateContext } from "./FieldStateContext";

export type RootProps = ComponentWrapperProps<FieldRootBaseProps> & {
    inline?: boolean;
    warning?: boolean;
};

function RootComponent(props: RootProps, ref: React.ForwardedRef<HTMLDivElement>): React.ReactNode {
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
                className={
                    props.inline
                        ? resolveClassNames("contents", props.layoutClassName)
                        : resolveClassNames("gap-vertical-xs flex flex-col items-start", props.layoutClassName)
                }
            >
                {props.children}
            </FieldBase.Root>
        </FieldStateContext.Provider>
    );
}

export const Root = React.forwardRef<HTMLDivElement, RootProps>(RootComponent);
