import React from "react";

import type { FieldRootProps as FieldRootBaseProps } from "@base-ui/react";
import { Field as FieldBase } from "@base-ui/react";
import { omit } from "lodash";

export type RootProps = {
    inline?: boolean;
    children?: React.ReactNode;
} & Omit<FieldRootBaseProps, "render" | "className">;

function RootComponent(props: RootProps, ref: React.ForwardedRef<HTMLDivElement>): React.ReactNode {
    const baseProps = omit(props, ["inline"]);

    return (
        <FieldBase.Root
            {...baseProps}
            ref={ref}
            render={props.inline ? <></> : undefined}
            className="gap-vertical-xs flex flex-col items-start"
        >
            {props.children}
        </FieldBase.Root>
    );
}

export const Root = React.forwardRef<HTMLDivElement, RootProps>(RootComponent);
