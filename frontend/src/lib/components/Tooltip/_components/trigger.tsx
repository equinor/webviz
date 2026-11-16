import type React from "react";

import type { TooltipTriggerProps as TooltipTriggerBaseProps } from "@base-ui/react/tooltip";
import { Tooltip as TooltipBase } from "@base-ui/react/tooltip";

import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/components/_shared/utils/wrapperProps";

type WrappedTriggerProps = Omit<ComponentWrapperProps<TooltipTriggerBaseProps>, "delay">;

const DELAY_MS_MAP = {
    short: 500,
    medium: 800,
    long: 1500,
} as const;

const DEFAULT_PROPS = {
    delay: "short",
} satisfies Partial<TriggerProps>;

export type TriggerProps = WrappedTriggerProps & {
    /** The element that triggers the tooltip. Must be a single React element. */
    children: React.ReactElement;
    /** How long to wait before showing the tooltip. @default "short" */
    delay?: keyof typeof DELAY_MS_MAP;
};

export function Trigger(props: TriggerProps): React.ReactNode {
    const defaultedProps = { ...DEFAULT_PROPS, ...props };
    const baseProps = resolveWrapperProps(defaultedProps, "delay", "children");

    const delayMs = DELAY_MS_MAP[defaultedProps.delay];

    return <TooltipBase.Trigger {...baseProps} delay={delayMs} render={props.children} />;
}
