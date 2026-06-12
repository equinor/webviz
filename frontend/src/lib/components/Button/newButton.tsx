import { Button as ButtonBase } from "@base-ui/react/button";
import type { ButtonProps as ButtonPropsBase } from "@base-ui/react/button";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type ButtonProps = {
    variant?: "contained" | "outlined" | "text";
    size?: "small" | "default" | "large";
    tone?: "accent" | "neutral" | "danger";
    disabled?: boolean;
    round?: boolean;
    iconOnly?: boolean;
} & ButtonPropsBase;

const DEFAULT_VALUES = {
    variant: "contained",
    size: "default",
    tone: "accent",
} satisfies Partial<ButtonProps>;

const VARIANT_TONE_CLASSES: Record<
    NonNullable<ButtonProps["variant"]>,
    Record<NonNullable<ButtonProps["tone"] | "disabled">, string>
> = {
    contained: {
        accent: "bg-accent-strong text-accent-strong-on-emphasis hover:bg-accent-strong-hover active:bg-accent-strong-active border-transparent",
        neutral:
            "bg-neutral-strong text-neutral-strong-on-emphasis hover:bg-neutral-strong-hover active:bg-neutral-strong-active  border-transparent",
        danger: "bg-danger-strong text-danger-strong-on-emphasis hover:bg-danger-strong-hover active:bg-danger-strong-active border-transparent",
        disabled: "bg-disabled text-disabled border-disabled cursor-not-allowed opacity-50",
    },
    outlined: {
        accent: "outline -outline-offset-1 outline-accent text-accent-subtle hover:bg-accent-hover active:bg-accent-active bg-transparent",
        neutral:
            "outline -outline-offset-1 outline-neutral text-neutral-subtle hover:bg-neutral-hover active:bg-neutral-active bg-transparent",
        danger: "outline -outline-offset-1 outline-danger text-danger-subtle hover:bg-danger-hover active:bg-danger-active bg-transparent",
        disabled:
            "outline -outline-offset-1 outline-disabled text-disabled cursor-not-allowed opacity-50 bg-transparent",
    },
    text: {
        accent: "text-accent-subtle hover:bg-accent-hover active:bg-accent-active bg-transparent",
        neutral:
            "text-neutral-subtle hover:bg-neutral-hover active:bg-neutral-active bg-transparent",
        danger: "text-danger-subtle hover:bg-danger-hover active:bg-danger-active bg-transparent",
        disabled: "text-disabled bg-disabled cursor-not-allowed opacity-50",
    },
};

const SIZE_CLASSES: Record<NonNullable<ButtonProps["size"]>, string> = {
    small: "button-sm",
    default: "button-md",
    large: "button-lg",
};

export function Button(props: ButtonProps) {
    const defaultedProps = { ...DEFAULT_VALUES, ...props };

    return (
        <ButtonBase
            {...defaultedProps}
            className={resolveClassNames(
                "button",
                {
                    "rounded-full": props.round,
                    rounded: !props.round,
                    "button__icon aspect-square justify-center": props.iconOnly,
                },
                SIZE_CLASSES[defaultedProps.size],
                VARIANT_TONE_CLASSES[defaultedProps.variant][
                    defaultedProps.disabled ? "disabled" : defaultedProps.tone
                ],
            )}
        >
            {props.iconOnly ? props.children : <span className="button__label">{props.children}</span>}
        </ButtonBase>
    );
}
