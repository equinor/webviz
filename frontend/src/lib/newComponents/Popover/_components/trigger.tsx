import type React from "react";

import type { PopoverTriggerProps as PopoverTriggerBaseProps } from "@base-ui/react/popover";
import { Popover as PopoverBase } from "@base-ui/react/popover";
import { omit } from "lodash";

import { Button } from "@lib/newComponents/Button";

export type TriggerProps = {
    iconOnly?: boolean;
    variant?: "contained" | "outlined" | "text";
    size?: "small" | "default" | "large";
    tone?: "accent" | "neutral" | "danger";
    round?: boolean;
    children: React.ReactNode;
} & Omit<PopoverTriggerBaseProps, "className" | "nativeButton" | "render">;

export function Trigger(props: TriggerProps): React.ReactNode {
    const baseProps = omit(props, ["iconOnly", "variant", "size", "tone", "round", "children"]);

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
                >
                    {props.children}
                </Button>
            )}
        />
    );
}
