import React from "react";

import { Button as ButtonBase } from "@base-ui/react/button";
import type { ButtonProps as ButtonPropsBase } from "@base-ui/react/button";

import { SELECTABLE_SIZES_CLASSNAMES, type SelectableSize } from "@lib/newComponents/_shared/size";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { resolveWrapperProps, type ComponentWrapperProps } from "../../_shared/wrapperProps";

export type ButtonProps = ComponentWrapperProps<Omit<ButtonPropsBase, "ref">> & {
    variant?: "contained" | "outlined" | "text";
    size?: SelectableSize;
    tone?: "accent" | "neutral" | "danger";
    disabled?: boolean;
    round?: boolean;
    iconOnly?: boolean;
    pressed?: boolean;
};

const VARIANT_TONE_CLASSES: Record<
    NonNullable<ButtonProps["variant"]>,
    Record<NonNullable<ButtonProps["tone"] | "disabled">, string>
> = {
    contained: {
        accent: "bg-accent-strong text-accent-strong-on-emphasis hover:bg-accent-strong-hover active:bg-accent-strong-active data-pressed:bg-accent-strong-active border-transparent",

        neutral:
            "bg-neutral-strong text-neutral-strong-on-emphasis hover:bg-neutral-strong-hover active:bg-neutral-strong-active border-transparent data-pressed:bg-neutral-strong-active",

        danger: "bg-danger-strong text-danger-strong-on-emphasis hover:bg-danger-strong-hover active:bg-danger-strong-active border-transparent data-pressed:bg-danger-strong-active",

        disabled: "bg-disabled text-disabled border-disabled cursor-not-allowed! opacity-50",
    },
    outlined: {
        accent: "outline -outline-offset-1 outline-accent text-accent-subtle hover:bg-accent-hover active:bg-accent-active bg-transparent data-pressed:bg-accent-active",
        neutral:
            "outline -outline-offset-1 outline-neutral text-neutral-subtle hover:bg-neutral-hover active:bg-neutral-active bg-transparent data-pressed:bg-neutral-active",

        danger: "outline -outline-offset-1 outline-danger text-danger-subtle hover:bg-danger-hover active:bg-danger-active bg-transparent data-pressed:bg-danger-active",

        disabled:
            "outline -outline-offset-1 outline-disabled text-disabled cursor-not-allowed! opacity-50 bg-transparent",
    },
    text: {
        accent: "text-accent-subtle hover:bg-accent-hover active:bg-accent-active data-pressed:bg-accent-active bg-transparent",

        neutral:
            "text-neutral-subtle hover:bg-neutral-hover active:bg-neutral-active data-pressed:bg-neutral-active bg-transparent",

        danger: "text-danger-subtle hover:bg-danger-hover active:bg-danger-active  data-pressed:bg-danger-active bg-transparent",

        disabled: "text-disabled cursor-not-allowed! opacity-50",
    },
};

const LABEL_SIZE_CLASSES: Record<NonNullable<ButtonProps["size"]>, string> = {
    small: "px-horizontal-2xs",
    default: "px-horizontal-xs",
    large: "px-horizontal-sm",
};

const ICON_SIZE_CLASSES: Record<NonNullable<ButtonProps["size"]>, string> = {
    small: "text-body-md!",
    default: "text-body-xl!",
    large: "text-body-2xl!",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(props, ref) {
    const { variant = "contained", size = "default", tone = "accent", ...rest } = props;
    const baseProps = resolveWrapperProps(rest, "round", "iconOnly", "pressed");

    return (
        <ButtonBase
            {...baseProps}
            ref={ref}
            data-pressed={props.pressed ? "" : undefined}
            className={resolveClassNames(
                props.layoutClassName,
                "focusable inline-flex cursor-pointer items-center rounded transition-colors duration-150 focus-visible:outline-0 [[data-group]_&:not(:first-child)]:rounded-l-none [[data-group]_&:not(:last-child)]:rounded-r-none",
                {
                    "aspect-square rounded-full": props.round,
                    rounded: !props.round,
                    "aspect-square justify-center": props.iconOnly,
                    [ICON_SIZE_CLASSES[size]]: props.iconOnly,
                },
                SELECTABLE_SIZES_CLASSNAMES[size],
                VARIANT_TONE_CLASSES[variant][props.disabled ? "disabled" : tone],
            )}
        >
            {props.iconOnly ? (
                props.children
            ) : (
                <span
                    className={resolveClassNames(
                        "gap-x-horizontal-2xs inline-flex h-full w-full items-center",
                        LABEL_SIZE_CLASSES[size],
                    )}
                >
                    {props.children}
                </span>
            )}
        </ButtonBase>
    );
});
