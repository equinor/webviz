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
        accent: "bg-fill-accent-strong text-text-accent-strong-on-emphasis hover:bg-fill-accent-strong-hover active:bg-fill-accent-strong-active border-transparent",
        neutral:
            "bg-fill-neutral-strong text-text-neutral-strong-on-emphasis hover:bg-fill-neutral-strong-hover active:bg-fill-neutral-strong-active  border-transparent",
        danger: "bg-fill-danger-strong text-text-danger-strong-on-emphasis hover:bg-fill-danger-strong-hover active:bg-fill-danger-strong-active border-transparent",
        disabled: "bg-fill-disabled text-text-disabled border-disabled cursor-not-allowed opacity-50",
    },
    outlined: {
        accent: "outline -outline-offset-1 outline-stroke-accent text-text-accent-subtle hover:bg-fill-accent-hover active:bg-accent-fill-muted-active bg-transparent",
        neutral:
            "outline -outline-offset-1 outline-stroke-neutral text-text-neutral-subtle hover:bg-fill-neutral-hover active:bg-neutral-fill-muted-active bg-transparent",
        danger: "outline -outline-offset-1 outline-stroke-danger text-text-danger-subtle hover:bg-fill-danger-hover active:bg-danger-fill-muted-active bg-transparent",
        disabled:
            "outline -outline-offset-1 outline-stroke-disabled text-text-disabled cursor-not-allowed opacity-50 bg-transparent",
    },
    text: {
        accent: "text-text-accent-subtle hover:bg-fill-accent-hover active:bg-accent-fill-muted-active bg-transparent",
        neutral:
            "text-text-neutral-subtle hover:bg-fill-neutral-hover active:bg-neutral-fill-muted-active bg-transparent",
        danger: "text-text-danger-subtle hover:bg-fill-danger-hover active:bg-danger-fill-muted-active bg-transparent",
        disabled: "text-text-disabled cursor-not-allowed opacity-50",
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
