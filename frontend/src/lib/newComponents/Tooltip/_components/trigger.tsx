import type React from "react";

import type { TooltipTriggerProps as TooltipTriggerBaseProps } from "@base-ui/react/tooltip";
import { Tooltip as TooltipBase } from "@base-ui/react/tooltip";

import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/wrapperProps";
import type { ButtonProps } from "@lib/newComponents/Button";
import { Button } from "@lib/newComponents/Button";

const BUTTON_PROPS = ["iconOnly", "variant", "size", "tone", "round"] as const;

type WrappedTriggerProps = Omit<ComponentWrapperProps<TooltipTriggerBaseProps>, "delay">;
type InheritedButtonProps = Pick<ButtonProps, (typeof BUTTON_PROPS)[number]>;

const DELAY_MS_MAP = {
    short: 500,
    medium: 800,
    long: 1500,
} as const;

const DEFAULT_PROPS = {
    delay: "short",
} satisfies Partial<TriggerProps>;

export type TriggerProps = WrappedTriggerProps &
    InheritedButtonProps & {
        children: React.ReactNode;
        delay?: keyof typeof DELAY_MS_MAP;
    };

export function Trigger(props: TriggerProps): React.ReactNode {
    const defaultedProps = { ...DEFAULT_PROPS, ...props };
    const baseProps = resolveWrapperProps(defaultedProps, ...BUTTON_PROPS, "delay");

    const delayMs = DELAY_MS_MAP[defaultedProps.delay];

    return (
        <TooltipBase.Trigger
            {...baseProps}
            delay={delayMs}
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
