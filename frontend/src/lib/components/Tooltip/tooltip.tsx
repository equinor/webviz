import React from "react";

import { Tooltip as EdsTooltip, type TooltipProps as EdsTooltipProps } from "@equinor/eds-core-react";

const DELAY_MS_MAP: Record<NonNullable<TooltipProps["enterDelay"]>, number> = {
    short: 500,
    medium: 800,
    long: 1500,
};

export type TooltipProps = Omit<EdsTooltipProps, "enterDelay"> & {
    /** Delay before showing the tooltip, undefined results in default of eds Tooltip */
    enterDelay?: "short" | "medium" | "long";
    visible?: boolean;
};

export const Tooltip = React.forwardRef<HTMLDivElement, TooltipProps>(function DelayedTooltip(
    { enterDelay, visible, ...rest },
    ref,
) {
    const enterDelayMs = enterDelay ? DELAY_MS_MAP[enterDelay] : undefined;

    if (!visible) {
        return rest.children;
    }

    return <EdsTooltip ref={ref} {...rest} enterDelay={enterDelayMs} />;
});
