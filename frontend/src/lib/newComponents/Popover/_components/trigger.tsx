import type React from "react";

import type { PopoverTriggerProps as PopoverTriggerBaseProps } from "@base-ui/react/popover";
import { Popover as PopoverBase } from "@base-ui/react/popover";

import type { ComponentWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";
import { resolveWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";
import type { ButtonProps } from "@lib/newComponents/Button";
import { Button } from "@lib/newComponents/Button";

export type TriggerProps = ComponentWrapperProps<
    Pick<ButtonProps, "variant" | "size" | "tone" | "round" | "iconOnly" | "compact">
> & {
    /** The content rendered inside the trigger button. */
    children: React.ReactNode;
} & Omit<PopoverTriggerBaseProps, "className" | "nativeButton" | "render">;

export function Trigger(props: TriggerProps): React.ReactNode {
    const baseProps = resolveWrapperProps(props, "variant", "size", "tone", "round", "iconOnly", "compact", "children");

    return (
        <PopoverBase.Trigger
            {...baseProps}
            render={(p, state) => (
                <Button
                    {...p}
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
