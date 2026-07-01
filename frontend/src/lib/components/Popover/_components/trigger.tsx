import React from "react";

import type { PopoverTriggerProps as PopoverTriggerBaseProps } from "@base-ui/react/popover";
import { Popover as PopoverBase } from "@base-ui/react/popover";

import type { ComponentWrapperProps } from "@lib/components/_shared/utils/wrapperProps";
import { resolveWrapperProps } from "@lib/components/_shared/utils/wrapperProps";
import type { ButtonProps } from "@lib/components/Button";
import { Button } from "@lib/components/Button";

export type TriggerProps = ComponentWrapperProps<
    Pick<ButtonProps, "variant" | "size" | "tone" | "round" | "iconOnly" | "compact">
> & {
    /** The content rendered inside the trigger button. */
    children: React.ReactNode;
} & Omit<PopoverTriggerBaseProps, "className" | "nativeButton" | "render">;

function TriggerComponent(props: TriggerProps, ref: React.ForwardedRef<HTMLButtonElement>) {
    const baseProps = resolveWrapperProps(props, "variant", "size", "tone", "round", "iconOnly", "compact", "children");

    return (
        <PopoverBase.Trigger
            {...baseProps}
            render={(p, state) => (
                <Button
                    {...p}
                    ref={ref}
                    round={props.round}
                    iconOnly={props.iconOnly}
                    variant={props.variant}
                    size={props.size}
                    tone={props.tone}
                    pressed={state.open}
                    compact={props.compact}
                >
                    {props.children}
                </Button>
            )}
        />
    );
}

export const Trigger = React.forwardRef<HTMLButtonElement, TriggerProps>(TriggerComponent);
