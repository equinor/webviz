import React from "react";

import { Button as ButtonBase } from "@base-ui/react/button";
import type { ButtonProps as ButtonPropsBase } from "@base-ui/react/button";
import { defaults } from "lodash";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type ButtonProps = {
    variant?: "contained" | "outlined" | "text";
    size?: "small" | "default" | "large";
    tone?: "accent" | "neutral" | "danger";
    disabled?: boolean;
    round?: boolean;
    iconOnly?: boolean;
    pressed?: boolean;
} & ButtonPropsBase;

const DEFAULT_PROPS = {
    variant: "contained",
    size: "default",
    tone: "accent",
} satisfies Partial<ButtonProps>;

const VARIANT_TONE_CLASSES: Record<
    NonNullable<ButtonProps["variant"]>,
    Record<NonNullable<ButtonProps["tone"] | "disabled">, string>
> = {
    contained: {
        accent: "bg-accent-strong text-accent-strong-on-emphasis hover:bg-accent-strong-hover active:bg-accent-strong-active data-pressed:bg-accent-strong-active border-transparent",

        neutral:
            "bg-neutral-strong text-neutral-strong-on-emphasis hover:bg-neutral-strong-hover active:bg-neutral-strong-active  border-transparent data-pressed:bg-neutral-strong-active",

        danger: "bg-danger-strong text-danger-strong-on-emphasis hover:bg-danger-strong-hover active:bg-danger-strong-active border-transparent data-pressed:bg-danger-strong-active",

        disabled: "bg-disabled text-disabled border-disabled cursor-not-allowed opacity-50",
    },
    outlined: {
        accent: "outline -outline-offset-1 outline-accent text-accent-subtle hover:bg-accent-hover active:bg-accent-active bg-transparent data-pressed:bg-accent-active",
        neutral:
            "outline -outline-offset-1 outline-neutral text-neutral-subtle hover:bg-neutral-hover active:bg-neutral-active bg-transparent data-pressed:bg-neutral-active",

        danger: "outline -outline-offset-1 outline-danger text-danger-subtle hover:bg-danger-hover active:bg-danger-active bg-transparent data-pressed:bg-danger-active",

        disabled:
            "outline -outline-offset-1 outline-disabled text-disabled cursor-not-allowed opacity-50 bg-transparent",
    },
    text: {
        accent: "text-accent-subtle hover:bg-accent-hover active:bg-accent-active data-pressed:bg-accent-active bg-transparent",

        neutral:
            "text-neutral-subtle hover:bg-neutral-hover active:bg-neutral-active data-pressed:bg-neutral-active bg-transparent",

        danger: "text-danger-subtle hover:bg-danger-hover active:bg-danger-active  data-pressed:bg-danger-active bg-transparent",

        disabled: "text-disabled cursor-not-allowed opacity-50",
    },
};

const SIZE_CLASSES: Record<NonNullable<ButtonProps["size"]>, string> = {
    small: "button-sm",
    default: "button-md",
    large: "button-lg",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(props, ref) {
    const defaultedProps = defaults({}, props, DEFAULT_PROPS);
    const { pressed, iconOnly, round, ...rest } = defaultedProps;

    return (
        <ButtonBase
            {...rest}
            ref={ref}
            data-pressed={pressed ? "" : undefined}
            className={resolveClassNames(
                "button",
                {
                    "rounded-full": round,
                    rounded: !round,
                    "button__icon aspect-square justify-center": iconOnly,
                },
                SIZE_CLASSES[defaultedProps.size],
                VARIANT_TONE_CLASSES[defaultedProps.variant][
                    defaultedProps.disabled ? "disabled" : defaultedProps.tone
                ],
            )}
        >
            {iconOnly ? props.children : <span className="button__label">{props.children}</span>}
        </ButtonBase>
    );
});
