import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { Tone } from "../_shared/types/tones";
import { withDefaults } from "../_shared/utils/defaultProps";

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
    /** Accessible label for the badge indicator. Defaults to the badge content when it is a string or number. */
    ariaLabel?: string;
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

const DEFAULT_PROPS = {
    tone: "accent",
    corner: "top-right",
    invisible: false,
} satisfies Partial<BadgeProps>;

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(function Badge(props, ref) {
    const defaultedProps = withDefaults(props, DEFAULT_PROPS);
    const { ariaLabel: explicitAriaLabel, badgeContent } = defaultedProps;
    const contentIsTextual = typeof badgeContent === "string" || typeof badgeContent === "number";
    const ariaLabel = explicitAriaLabel ?? (contentIsTextual ? String(badgeContent) : undefined);

    return (
        <span ref={ref} className="relative inline-flex items-center justify-center">
            {defaultedProps.children}
            <span
                aria-label={ariaLabel}
                aria-hidden={defaultedProps.invisible || undefined}
                className={resolveClassNames(
                    "text-body-xs z-elevated px-3xs absolute box-border flex h-4 min-h-2 min-w-4 items-center justify-center rounded-full font-sans leading-none whitespace-nowrap",
                    TONE_TO_CLASSNAMES[defaultedProps.tone],
                    CORNER_TO_CLASSNAMES[defaultedProps.corner],
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
