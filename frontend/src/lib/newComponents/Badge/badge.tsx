import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { Tone } from "../_shared/types/tones";

export type BadgeProps = {
    /** Controls the color tone of the badge. @default "accent" */
    tone?: Tone;
    /** The content displayed inside the badge indicator. */
    badgeContent: React.ReactNode;
    /** The corner of the child element where the badge is anchored. @default "top-right" */
    corner?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
    /** The element(s) the badge is overlaid on. */
    children?: React.ReactNode;
    /** When true, hides the badge without removing it from the DOM. @default false */
    invisible?: boolean;
};

const TONE_TO_CLASSNAMES: Record<NonNullable<BadgeProps["tone"]>, string> = {
    accent: "bg-accent-strong text-accent-strong-on-emphasis",
    warning: "bg-warning-strong text-warning-strong-on-emphasis",
    danger: "bg-danger-strong text-danger-strong-on-emphasis",
    success: "bg-success-strong text-success-strong-on-emphasis",
    neutral: "bg-neutral-strong text-neutral-strong-on-emphasis",
    info: "bg-info-strong text-info-strong-on-emphasis",
};

const CORNER_TO_CLASSNAMES: Record<NonNullable<BadgeProps["corner"]>, string> = {
    "top-right": "top-0 right-0 translate-x-2/3 -translate-y-2/3",
    "top-left": "top-0 left-0 -translate-x-2/3 -translate-y-2/3",
    "bottom-right": "bottom-0 right-0 translate-x-2/3 translate-y-2/3",
    "bottom-left": "bottom-0 left-0 -translate-x-2/3 translate-y-2/3",
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(function Badge(props, ref) {
    const { tone = "accent", corner = "top-right", invisible = false } = props;

    return (
        <span ref={ref} className="relative inline-flex items-center justify-center">
            {props.children}
            <span
                className={resolveClassNames(
                    "text-body-xs z-elevated px-3xs absolute box-border flex h-4 min-h-2 min-w-4 items-center justify-center rounded-full font-sans leading-none whitespace-nowrap",
                    TONE_TO_CLASSNAMES[tone],
                    CORNER_TO_CLASSNAMES[corner],
                    {
                        invisible,
                    },
                )}
            >
                {props.badgeContent}
            </span>
        </span>
    );
});
