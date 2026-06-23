import { withDefaults } from "@lib/newComponents/_shared/utils/defaultProps";
import type { SelectableSize } from "@lib/newComponents/_shared/utils/size";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export const VARIANT_TONE_CLASSES: Record<
    NonNullable<ButtonStyleProps["variant"]>,
    Record<NonNullable<ButtonStyleProps["tone"] | "disabled">, string>
> = {
    contained: {
        accent: "bg-accent-strong text-accent-strong-on-emphasis hover:bg-accent-strong-hover active:bg-accent-strong-active data-pressed:bg-accent-strong-active border-transparent",

        neutral:
            "bg-neutral-strong text-neutral-strong-on-emphasis hover:bg-neutral-strong-hover active:bg-neutral-strong-active border-transparent data-pressed:bg-neutral-strong-active",

        danger: "bg-danger-strong text-danger-strong-on-emphasis hover:bg-danger-strong-hover active:bg-danger-strong-active border-transparent data-pressed:bg-danger-strong-active",

        warning:
            "bg-warning-strong text-warning-strong-on-emphasis hover:bg-warning-strong-hover active:bg-warning-strong-active border-transparent data-pressed:bg-warning-strong-active",

        disabled: "bg-disabled text-disabled border-disabled cursor-not-allowed! opacity-50",
    },
    outlined: {
        accent: "outline -outline-offset-1 outline-accent-strong text-accent-subtle hover:bg-accent-hover active:bg-accent-active bg-transparent data-pressed:bg-accent-active",
        neutral:
            "outline -outline-offset-1 outline-neutral-strong text-neutral-subtle hover:bg-neutral-hover active:bg-neutral-active bg-transparent data-pressed:bg-neutral-active",

        danger: "outline -outline-offset-1 outline-danger-strong text-danger-subtle hover:bg-danger-hover active:bg-danger-active bg-transparent data-pressed:bg-danger-active",
        warning:
            "outline -outline-offset-1 outline-warning-strong text-warning-subtle hover:bg-warning-hover active:bg-warning-active bg-transparent data-pressed:bg-warning-active",

        disabled:
            "outline -outline-offset-1 outline-disabled text-disabled cursor-not-allowed! opacity-50 bg-transparent",
    },
    ghost: {
        accent: "text-accent-subtle hover:bg-accent-hover active:bg-accent-active data-pressed:bg-accent-active bg-transparent",

        neutral:
            "text-neutral-subtle hover:bg-neutral-hover active:bg-neutral-active data-pressed:bg-neutral-active bg-transparent",

        danger: "text-danger-subtle hover:bg-danger-hover active:bg-danger-active  data-pressed:bg-danger-active bg-transparent",
        warning:
            "text-warning-subtle hover:bg-warning-hover active:bg-warning-active  data-pressed:bg-warning-active bg-transparent",

        disabled: "text-disabled cursor-not-allowed! opacity-50",
    },
};

export const LABEL_SIZE_CLASSES: Record<SelectableSize, string> = {
    small: "text-body-sm! leading-body-sm-squished",
    default: "text-body-md! leading-body-md-squished",
    large: "text-body-lg! leading-body-lg-squished",
};

export const BUTTON_SIZE_CLASSES: Record<SelectableSize, string> = {
    small: "text-body-sm py-[calc(var(--eds-selectable-space-vertical)-(var(--leading-body-sm-squished)-8px)/2)]",
    default: "text-body-md py-[calc(var(--eds-selectable-space-vertical)-(var(--leading-body-md-squished)-12px)/2)]",
    large: "text-body-lg py-[calc(var(--eds-selectable-space-vertical)-(var(--leading-body-lg-squished)-12px)/2)]",
};

export const ICON_SIZE_CLASSES: Record<SelectableSize, string> = {
    small: "text-body-md!",
    default: "text-body-xl!",
    large: "text-body-2xl!",
};

export const STYLE_PROP_KEYS = ["variant", "tone", "disabled", "round", "iconOnly", "compact"] as const;
export type ButtonStyleProps = {
    /** Visual style of the button. @default "contained" */
    variant?: "contained" | "outlined" | "ghost";
    /** Controls the color tone of the button. @default "accent" */
    tone?: "accent" | "neutral" | "danger" | "warning";
    /** When true, disables the button and applies disabled styling. */
    disabled?: boolean;
    /** When true, renders the button as a circle. */
    round?: boolean;
    /** When true, removes padding and sizes the button to its icon content. */
    iconOnly?: boolean;
    /** When true, reduces horizontal padding for use in tight spaces. */
    compact?: boolean;
};

const DEFAULT_STYLE_PROPS = {
    variant: "contained",
    tone: "accent",
} satisfies Partial<ButtonStyleProps>;

export function resolveButtonClassNames(size: SelectableSize, styleProps: ButtonStyleProps) {
    const defaultedProps = withDefaults(styleProps, DEFAULT_STYLE_PROPS);

    return resolveClassNames(
        "px-selectable inline-flex cursor-pointer items-center rounded",
        "transition-colors duration-150",
        "focusable focus-visible:outline-0",
        "group-data-group/button-group:not-first-of-type:rounded-l-none group-data-group/button-group:not-last-of-type:rounded-r-none",
        BUTTON_SIZE_CLASSES[size],
        VARIANT_TONE_CLASSES[defaultedProps.variant][defaultedProps.disabled ? "disabled" : defaultedProps.tone],
        {
            "aspect-square w-fit rounded-full": defaultedProps.round,
            rounded: !defaultedProps.round,
            "aspect-square justify-center p-0!": defaultedProps.iconOnly,
            [ICON_SIZE_CLASSES[size]]: defaultedProps.iconOnly,
            "px-3xs! aspect-auto!": defaultedProps.compact,
        },
    );
}

export function resolveButtonLabelClassNames(size: SelectableSize) {
    return resolveClassNames("gap-x-2xs inline-flex h-full w-full items-center", LABEL_SIZE_CLASSES[size]);
}
