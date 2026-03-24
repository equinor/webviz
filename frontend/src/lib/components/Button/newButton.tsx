import { Button as ButtonBase } from "@base-ui/react/button";
import type { ButtonProps as ButtonPropsBase } from "@base-ui/react/button";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type ButtonProps = {
    variant?: "contained" | "outlined" | "text";
    size?: "small" | "default" | "large";
    tone?: "accent" | "neutral" | "danger";
    disabled?: boolean;
    round?: boolean;
} & ButtonPropsBase;

const DEFAULT_VALUES = {
    variant: "contained",
    size: "default",
    tone: "accent",
} satisfies Partial<ButtonProps>;

const VARIANT_TONE_CLASSES: Record<
    NonNullable<ButtonProps["variant"]>,
    Record<NonNullable<ButtonProps["tone"]>, string>
> = {
    contained: {
        accent: "bg-fill-accent-strong text-text-on-strong hover:bg-fill-accent-strong-hover active:bg-fill-accent-strong-active border-transparent",
        neutral:
            "bg-fill-neutral-strong text-text-on-strong hover:bg-fill-neutral-strong-hover active:bg-fill-neutral-strong-active  border-transparent",
        danger: "bg-fill-danger-strong text-text-on-strong hover:bg-fill-danger-strong-hover active:bg-fill-danger-strong-active border-transparent",
    },
    outlined: {
        accent: "border border-stroke-accent text-text-accent hover:bg-fill-accent-hover active:bg-accent-fill-muted-active bg-transparent",
        neutral:
            "border border-stroke-neutral text-text-neutral hover:bg-fill-neutral-hover active:bg-neutral-fill-muted-active bg-transparent",
        danger: "border border-stroke-danger text-text-danger hover:bg-fill-danger-hover active:bg-danger-fill-muted-active bg-transparent",
    },
    text: {
        accent: "text-text-accent hover:bg-fill-accent-hover active:bg-accent-fill-muted-active bg-transparent",
        neutral: "text-text-neutral hover:bg-fill-neutral-hover active:bg-neutral-fill-muted-active bg-transparent",
        danger: "text-text-danger hover:bg-fill-danger-hover active:bg-danger-fill-muted-active bg-transparent",
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
                },
                SIZE_CLASSES[defaultedProps.size],
                VARIANT_TONE_CLASSES[defaultedProps.variant][defaultedProps.tone],
            )}
        />
    );
}
