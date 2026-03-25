import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type TypographyProps = {
    family: "header" | "body";
    size: "xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl";
    tone?: "accent" | "neutral" | "danger" | "success" | "warning" | "info";
    as?: React.ElementType;
    lineHeight?: "default" | "squished";
    weight?: "lighter" | "normal" | "bolder";
    className?: string;
    children?: React.ReactNode;
};

const FONT_SIZE_CLASSES: Record<TypographyProps["family"], Record<TypographyProps["size"], string>> = {
    header: {
        xs: "text-header-xs",
        sm: "text-header-sm",
        md: "text-header-md",
        lg: "text-header-lg",
        xl: "text-header-xl",
        "2xl": "text-header-2xl",
        "3xl": "text-header-3xl",
        "4xl": "text-header-4xl",
        "5xl": "text-header-5xl",
        "6xl": "text-header-6xl",
    },
    body: {
        xs: "text-body-xs",
        sm: "text-body-sm",
        md: "text-body-md",
        lg: "text-body-lg",
        xl: "text-body-xl",
        "2xl": "text-body-2xl",
        "3xl": "text-body-3xl",
        "4xl": "text-body-4xl",
        "5xl": "text-body-5xl",
        "6xl": "text-body-6xl",
    },
};

const LINE_HEIGHT_CLASSES: Record<
    TypographyProps["family"],
    Record<Required<TypographyProps>["lineHeight"], string>
> = {
    header: {
        default: "leading-header-default",
        squished: "leading-header-squished",
    },
    body: {
        default: "leading-body-default",
        squished: "leading-body-squished",
    },
};

const WEIGHT_CLASSES: Record<Required<TypographyProps>["weight"], string> = {
    lighter: "font-light",
    normal: "font-normal",
    bolder: "font-bold",
};

const DEFAULT_VALUES = {
    as: "span",
    lineHeight: "default",
    weight: "normal",
} satisfies Partial<TypographyProps>;

export function Typography(props: TypographyProps) {
    const defaultedProps = { ...DEFAULT_VALUES, ...props };

    const Component = defaultedProps.as;

    const className = resolveClassNames(
        FONT_SIZE_CLASSES[defaultedProps.family][defaultedProps.size],
        LINE_HEIGHT_CLASSES[defaultedProps.family][defaultedProps.lineHeight],
        WEIGHT_CLASSES[defaultedProps.weight],
        defaultedProps.className,
    );

    return <Component className={className}>{defaultedProps.children}</Component>;
}
