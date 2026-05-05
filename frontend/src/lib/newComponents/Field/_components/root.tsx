import React from "react";

import type { FieldRootProps as FieldRootBaseProps } from "@base-ui/react";
import { Field as FieldBase } from "@base-ui/react";

import { useWrappedBaseUIProps, type WrappedBaseUIProps } from "@lib/newComponents/_shared/useWrappedBaseUIProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type RootProps = WrappedBaseUIProps<FieldRootBaseProps> & {
    inline?: boolean;
};

function RootComponent(props: RootProps, ref: React.ForwardedRef<HTMLDivElement>): React.ReactNode {
    const baseProps = useWrappedBaseUIProps(props, "inline");

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
