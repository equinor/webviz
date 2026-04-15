import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { Tone } from "../_shared/colors";

export type BadgeProps = {
    tone?: Tone;
    badgeContent: React.ReactNode;
    children?: React.ReactNode;
    invisible?: boolean;
};

const DEFAULT_PROPS = {
    tone: "accent",
    invisible: false,
} satisfies Partial<BadgeProps>;

const TONE_TO_CLASSNAMES: Record<NonNullable<BadgeProps["tone"]>, string> = {
    accent: "bg-accent-strong text-accent-strong-on-emphasis",
    warning: "bg-warning-strong text-warning-strong-on-emphasis",
    error: "bg-danger-strong text-danger-strong-on-emphasis",
    success: "bg-success-strong text-success-strong-on-emphasis",
    neutral: "bg-neutral-strong text-neutral-strong-on-emphasis",
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(function Badge(props, ref) {
    const defaultedProps = { ...DEFAULT_PROPS, ...props };

    return (
        <span ref={ref} className="relative">
            {defaultedProps.children}
            <span
                className={resolveClassNames(
                    "text-body-xs z-elevated px-horizontal-3xs py-vertical-2xs absolute top-0 right-0 box-border flex h-4 min-w-4 translate-x-1/3 -translate-y-1/3 items-center justify-center rounded-full leading-none whitespace-nowrap",
                    TONE_TO_CLASSNAMES[defaultedProps.tone ?? DEFAULT_PROPS.tone],
                    {
                        invisible: defaultedProps.invisible,
                    },
                )}
            >
                {defaultedProps.badgeContent}
            </span>
        </span>
    );
});
