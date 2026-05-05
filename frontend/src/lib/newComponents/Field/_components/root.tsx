import React from "react";

import type { FieldRootProps as FieldRootBaseProps } from "@base-ui/react";
import { Field as FieldBase } from "@base-ui/react";

import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/wrapperProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type RootProps = ComponentWrapperProps<FieldRootBaseProps> & {
    inline?: boolean;
};

function RootComponent(props: RootProps, ref: React.ForwardedRef<HTMLDivElement>): React.ReactNode {
    const baseProps = resolveWrapperProps(props, "inline");

    return (
        <FieldBase.Root
            {...baseProps}
            ref={ref}
            render={props.inline ? <></> : undefined}
            className={resolveClassNames("gap-vertical-xs flex flex-col items-start", props.layoutClassName)}
        >
            {props.children}
        </FieldBase.Root>
    );
}

export const Root = React.forwardRef<HTMLDivElement, RootProps>(RootComponent);
