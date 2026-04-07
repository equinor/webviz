import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type TypographyProps = {
    family: "header" | "body";
    size: "xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl";
    tone?: "accent" | "neutral" | "danger" | "success" | "warning" | "info";
    as?: React.ElementType;
    lineHeight?: "default" | "squished";
    weight?: "lighter" | "normal" | "bolder";
    tracking?: "tight" | "normal" | "wide";
    italic?: boolean;
    className?: string;
    children?: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLElement>, "children" | "className">;

const FONT_SIZE_CLASSES: Record<
    TypographyProps["family"],
    Record<
        TypographyProps["size"],
        Record<NonNullable<TypographyProps["lineHeight"]>, Record<NonNullable<TypographyProps["tracking"]>, string>>
    >
> = {
    header: {
        xs: {
            default: {
                tight: "text-header-xs tracking-header-xs-tight leading-header-xs",
                normal: "text-header-xs tracking-header-xs-normal leading-header-xs",
                wide: "text-header-xs tracking-header-xs-wide leading-header-xs",
            },
            squished: {
                tight: "text-header-xs tracking-header-xs-tight leading-header-xs-squished",
                normal: "text-header-xs tracking-header-xs-normal leading-header-xs-squished",
                wide: "text-header-xs tracking-header-xs-wide leading-header-xs-squished",
            },
        },
        sm: {
            default: {
                tight: "text-header-sm tracking-header-sm-tight leading-header-sm",
                normal: "text-header-sm tracking-header-sm-normal leading-header-sm",
                wide: "text-header-sm tracking-header-sm-wide leading-header-sm",
            },
            squished: {
                tight: "text-header-sm tracking-header-sm-tight leading-header-sm-squished",
                normal: "text-header-sm tracking-header-sm-normal leading-header-sm-squished",
                wide: "text-header-sm tracking-header-sm-wide leading-header-sm-squished",
            },
        },
        md: {
            default: {
                tight: "text-header-md tracking-header-md-tight leading-header-md",
                normal: "text-header-md tracking-header-md-normal leading-header-md",
                wide: "text-header-md tracking-header-md-wide leading-header-md",
            },
            squished: {
                tight: "text-header-md tracking-header-md-tight leading-header-md-squished",
                normal: "text-header-md tracking-header-md-normal leading-header-md-squished",
                wide: "text-header-md tracking-header-md-wide leading-header-md-squished",
            },
        },
        lg: {
            default: {
                tight: "text-header-lg tracking-header-lg-tight leading-header-lg",
                normal: "text-header-lg tracking-header-lg-normal leading-header-lg",
                wide: "text-header-lg tracking-header-lg-wide leading-header-lg",
            },
            squished: {
                tight: "text-header-lg tracking-header-lg-tight leading-header-lg-squished",
                normal: "text-header-lg tracking-header-lg-normal leading-header-lg-squished",
                wide: "text-header-lg tracking-header-lg-wide leading-header-lg-squished",
            },
        },
        xl: {
            default: {
                tight: "text-header-xl tracking-header-xl-tight leading-header-xl",
                normal: "text-header-xl tracking-header-xl-normal leading-header-xl",
                wide: "text-header-xl tracking-header-xl-wide leading-header-xl",
            },
            squished: {
                tight: "text-header-xl tracking-header-xl-tight leading-header-xl-squished",
                normal: "text-header-xl tracking-header-xl-normal leading-header-xl-squished",
                wide: "text-header-xl tracking-header-xl-wide leading-header-xl-squished",
            },
        },
        "2xl": {
            default: {
                tight: "text-header-2xl tracking-header-2xl-tight leading-header-2xl",
                normal: "text-header-2xl tracking-header-2xl-normal leading-header-2xl",
                wide: "text-header-2xl tracking-header-2xl-wide leading-header-2xl",
            },
            squished: {
                tight: "text-header-2xl tracking-header-2xl-tight leading-header-2xl-squished",
                normal: "text-header-2xl tracking-header-2xl-normal leading-header-2xl-squished",
                wide: "text-header-2xl tracking-header-2xl-wide leading-header-2xl-squished",
            },
        },
        "3xl": {
            default: {
                tight: "text-header-3xl tracking-header-3xl-tight leading-header-3xl",
                normal: "text-header-3xl tracking-header-3xl-normal leading-header-3xl",
                wide: "text-header-3xl tracking-header-3xl-wide leading-header-3xl",
            },
            squished: {
                tight: "text-header-3xl tracking-header-3xl-tight leading-header-3xl-squished",
                normal: "text-header-3xl tracking-header-3xl-normal leading-header-3xl-squished",
                wide: "text-header-3xl tracking-header-3xl-wide leading-header-3xl-squished",
            },
        },
        "4xl": {
            default: {
                tight: "text-header-4xl tracking-header-4xl-tight leading-header-4xl",
                normal: "text-header-4xl tracking-header-4xl-normal leading-header-4xl",
                wide: "text-header-4xl tracking-header-4xl-wide leading-header-4xl",
            },
            squished: {
                tight: "text-header-4xl tracking-header-4xl-tight leading-header-4xl-squished",
                normal: "text-header-4xl tracking-header-4xl-normal leading-header-4xl-squished",
                wide: "text-header-4xl tracking-header-4xl-wide leading-header-4xl-squished",
            },
        },
        "5xl": {
            default: {
                tight: "text-header-5xl tracking-header-5xl-tight leading-header-5xl",
                normal: "text-header-5xl tracking-header-5xl-normal leading-header-5xl",
                wide: "text-header-5xl tracking-header-5xl-wide leading-header-5xl",
            },
            squished: {
                tight: "text-header-5xl tracking-header-5xl-tight leading-header-5xl-squished",
                normal: "text-header-5xl tracking-header-5xl-normal leading-header-5xl-squished",
                wide: "text-header-5xl tracking-header-5xl-wide leading-header-5xl-squished",
            },
        },
        "6xl": {
            default: {
                tight: "text-header-6xl tracking-header-6xl-tight leading-header-6xl",
                normal: "text-header-6xl tracking-header-6xl-normal leading-header-6xl",
                wide: "text-header-6xl tracking-header-6xl-wide leading-header-6xl",
            },
            squished: {
                tight: "text-header-6xl tracking-header-6xl-tight leading-header-6xl-squished",
                normal: "text-header-6xl tracking-header-6xl-normal leading-header-6xl-squished",
                wide: "text-header-6xl tracking-header-6xl-wide leading-header-6xl-squished",
            },
        },
    },
    body: {
        xs: {
            default: {
                tight: "text-body-xs tracking-body-xs-tight leading-body-xs",
                normal: "text-body-xs tracking-body-xs-normal leading-body-xs",
                wide: "text-body-xs tracking-body-xs-wide leading-body-xs",
            },
            squished: {
                tight: "text-body-xs tracking-body-xs-tight leading-body-xs-squished",
                normal: "text-body-xs tracking-body-xs-normal leading-body-xs-squished",
                wide: "text-body-xs tracking-body-xs-wide leading-body-xs-squished",
            },
        },
        sm: {
            default: {
                tight: "text-body-sm tracking-body-sm-tight leading-body-sm",
                normal: "text-body-sm tracking-body-sm-normal leading-body-sm",
                wide: "text-body-sm tracking-body-sm-wide leading-body-sm",
            },
            squished: {
                tight: "text-body-sm tracking-body-sm-tight leading-body-sm-squished",
                normal: "text-body-sm tracking-body-sm-normal leading-body-sm-squished",
                wide: "text-body-sm tracking-body-sm-wide leading-body-sm-squished",
            },
        },
        md: {
            default: {
                tight: "text-body-md tracking-body-md-tight leading-body-md",
                normal: "text-body-md tracking-body-md-normal leading-body-md",
                wide: "text-body-md tracking-body-md-wide leading-body-md",
            },
            squished: {
                tight: "text-body-md tracking-body-md-tight leading-body-md-squished",
                normal: "text-body-md tracking-body-md-normal leading-body-md-squished",
                wide: "text-body-md tracking-body-md-wide leading-body-md-squished",
            },
        },
        lg: {
            default: {
                tight: "text-body-lg tracking-body-lg-tight leading-body-lg",
                normal: "text-body-lg tracking-body-lg-normal leading-body-lg",
                wide: "text-body-lg tracking-body-lg-wide leading-body-lg",
            },
            squished: {
                tight: "text-body-lg tracking-body-lg-tight leading-body-lg-squished",
                normal: "text-body-lg tracking-body-lg-normal leading-body-lg-squished",
                wide: "text-body-lg tracking-body-lg-wide leading-body-lg-squished",
            },
        },
        xl: {
            default: {
                tight: "text-body-xl tracking-body-xl-tight leading-body-xl",
                normal: "text-body-xl tracking-body-xl-normal leading-body-xl",
                wide: "text-body-xl tracking-body-xl-wide leading-body-xl",
            },
            squished: {
                tight: "text-body-xl tracking-body-xl-tight leading-body-xl-squished",
                normal: "text-body-xl tracking-body-xl-normal leading-body-xl-squished",
                wide: "text-body-xl tracking-body-xl-wide leading-body-xl-squished",
            },
        },
        "2xl": {
            default: {
                tight: "text-body-2xl tracking-body-2xl-tight leading-body-2xl",
                normal: "text-body-2xl tracking-body-2xl-normal leading-body-2xl",
                wide: "text-body-2xl tracking-body-2xl-wide leading-body-2xl",
            },
            squished: {
                tight: "text-body-2xl tracking-body-2xl-tight leading-body-2xl-squished",
                normal: "text-body-2xl tracking-body-2xl-normal leading-body-2xl-squished",
                wide: "text-body-2xl tracking-body-2xl-wide leading-body-2xl-squished",
            },
        },
        "3xl": {
            default: {
                tight: "text-body-3xl tracking-body-3xl-tight leading-body-3xl",
                normal: "text-body-3xl tracking-body-3xl-normal leading-body-3xl",
                wide: "text-body-3xl tracking-body-3xl-wide leading-body-3xl",
            },
            squished: {
                tight: "text-body-3xl tracking-body-3xl-tight leading-body-3xl-squished",
                normal: "text-body-3xl tracking-body-3xl-normal leading-body-3xl-squished",
                wide: "text-body-3xl tracking-body-3xl-wide leading-body-3xl-squished",
            },
        },
        "4xl": {
            default: {
                tight: "text-body-4xl tracking-body-4xl-tight leading-body-4xl",
                normal: "text-body-4xl tracking-body-4xl-normal leading-body-4xl",
                wide: "text-body-4xl tracking-body-4xl-wide leading-body-4xl",
            },
            squished: {
                tight: "text-body-4xl tracking-body-4xl-tight leading-body-4xl-squished",
                normal: "text-body-4xl tracking-body-4xl-normal leading-body-4xl-squished",
                wide: "text-body-4xl tracking-body-4xl-wide leading-body-4xl-squished",
            },
        },
        "5xl": {
            default: {
                tight: "text-body-5xl tracking-body-5xl-tight leading-body-5xl",
                normal: "text-body-5xl tracking-body-5xl-normal leading-body-5xl",
                wide: "text-body-5xl tracking-body-5xl-wide leading-body-5xl",
            },
            squished: {
                tight: "text-body-5xl tracking-body-5xl-tight leading-body-5xl-squished",
                normal: "text-body-5xl tracking-body-5xl-normal leading-body-5xl-squished",
                wide: "text-body-5xl tracking-body-5xl-wide leading-body-5xl-squished",
            },
        },
        "6xl": {
            default: {
                tight: "text-body-6xl tracking-body-6xl-tight leading-body-6xl",
                normal: "text-body-6xl tracking-body-6xl-normal leading-body-6xl",
                wide: "text-body-6xl tracking-body-6xl-wide leading-body-6xl",
            },
            squished: {
                tight: "text-body-6xl tracking-body-6xl-tight leading-body-6xl-squished",
                normal: "text-body-6xl tracking-body-6xl-normal leading-body-6xl-squished",
                wide: "text-body-6xl tracking-body-6xl-wide leading-body-6xl-squished",
            },
        },
    },
};

const TONE_CLASSES: Record<NonNullable<TypographyProps["tone"]>, string> = {
    accent: "text-text-accent-subtle",
    neutral: "text-text-neutral-subtle",
    danger: "text-text-danger-subtle",
    success: "text-text-success-subtle",
    warning: "text-text-warning-subtle",
    info: "text-text-info-subtle",
};

const WEIGHT_CLASSES: Record<Required<TypographyProps>["weight"], string> = {
    lighter: "font-light",
    normal: "font-normal",
    bolder: "font-bolder",
};

const DEFAULT_VALUES = {
    as: "span",
    lineHeight: "default",
    weight: "normal",
    tracking: "normal",
} satisfies Partial<TypographyProps>;

export function Typography(props: TypographyProps) {
    const {
        family,
        size,
        tone,
        as = DEFAULT_VALUES.as,
        lineHeight = DEFAULT_VALUES.lineHeight,
        weight = DEFAULT_VALUES.weight,
        tracking = DEFAULT_VALUES.tracking,
        className,
        children,
        ...htmlProps
    } = props;

    const Component = as;

    const resolvedClassName = resolveClassNames(
        FONT_SIZE_CLASSES[family][size][lineHeight][tracking],
        WEIGHT_CLASSES[weight],
        tone ? TONE_CLASSES[tone] : "text-text-neutral",
        className,
        { italic: props.italic },
    );

    return (
        <Component className={resolvedClassName} {...htmlProps}>
            {children}
        </Component>
    );
}
