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
        accent: "bg-accent-fill-emphasis-default text-strong-on-emphasis hover:bg-accent-fill-emphasis-hover active:bg-accent-fill-emphasis-active border-transparent",
        neutral:
            "bg-neutral-fill-emphasis-default text-strong-on-emphasis hover:bg-neutral-fill-emphasis-hover active:bg-neutral-fill-emphasis-active  border-transparent",
        danger: "bg-danger-fill-emphasis-default text-strong-on-emphasis hover:bg-danger-fill-emphasis-hover active:bg-danger-fill-emphasis-active border-transparent",
    },
    outlined: {
        accent: "border border-accent-strong text-accent-subtle hover:bg-accent-fill-muted-hover active::bg-accent-fill-muted-active bg-transparent",
        neutral:
            "border border-neutral-strong text-subtle hover:bg-neutral-fill-muted-hover active::bg-neutral-fill-muted-active bg-transparent",
        danger: "border border-danger-strong text-danger-subtle hover:bg-danger-fill-muted-hover active::bg-danger-fill-muted-active bg-transparent",
    },
    text: {
        accent: "text-accent-subtle hover:bg-accent-fill-muted-hover active:bg-accent-fill-muted-active bg-transparent",
        neutral: "text-subtle hover:bg-neutral-fill-muted-hover active:bg-neutral-fill-muted-active bg-transparent",
        danger: "text-danger-subtle hover:bg-danger-fill-muted-hover active:bg-danger-fill-muted-active bg-transparent",
    },
};

const SIZE_CLASSES: Record<NonNullable<ButtonProps["size"]>, string> = {
    small: "px-1 py-0.5 text-xs",
    default: "px-selectable-horizontal py-selectable-vertical text-sm",
    large: "px-4 py-2   text-base",
};

export function Button(props: ButtonProps) {
    const defaultedProps = { ...DEFAULT_VALUES, ...props };

    return (
        <ButtonBase
            {...defaultedProps}
            className={resolveClassNames(
                "inline-flex items-center gap-2",
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
