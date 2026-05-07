import type React from "react";

import type { TooltipTriggerProps as TooltipTriggerBaseProps } from "@base-ui/react/tooltip";
import { Tooltip as TooltipBase } from "@base-ui/react/tooltip";

import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/wrapperProps";
import type { ButtonProps } from "@lib/newComponents/Button";
import { Button } from "@lib/newComponents/Button";

const BUTTON_PROPS = ["iconOnly", "variant", "size", "tone", "round"] as const;

type WrappedTriggerProps = ComponentWrapperProps<TooltipTriggerBaseProps>;
type InheritedButtonProps = Pick<ButtonProps, (typeof BUTTON_PROPS)[number]>;

export type TriggerProps = {
    children: React.ReactNode;
} & WrappedTriggerProps &
    InheritedButtonProps;

export function Trigger(props: TriggerProps): React.ReactNode {
    const baseProps = resolveWrapperProps(props, ...BUTTON_PROPS);

    return (
        <TooltipBase.Trigger
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
