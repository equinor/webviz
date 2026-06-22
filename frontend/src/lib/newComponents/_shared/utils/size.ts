import { clamp } from "lodash";

export type PixelSize = "em" | 16 | 24 | 32 | 40 | 48;

const TEXT_SIZES = ["xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl"] as const;
export type TextSize = (typeof TEXT_SIZES)[number];

export const PIXEL_SIZES_CLASSNAMES: Record<PixelSize, string> = {
    em: "aspect-square h-[1em]",
    16: "aspect-square h-4",
    24: "aspect-square h-6",
    32: "aspect-square h-8",
    40: "aspect-square h-10",
    48: "aspect-square h-12",
    em: "aspect-square h-[1em] w-[1em]",
};

export type SelectableSize = "small" | "default" | "large";

export const SELECTABLE_SIZES_CLASSNAMES: Record<SelectableSize, string> = {
    small: "min-h-selectable-sm text-body-sm",
    default: "min-h-selectable-md text-body-md",
    large: "min-h-selectable-lg text-body-lg",
};

export function getDataAttributesForSelectableSize(size: SelectableSize, squished?: boolean): Record<string, string> {
    const mapping: Record<SelectableSize, string> = {
        small: "sm",
        default: "md",
        large: "lg",
    };

    return {
        "data-selectable-space": mapping[size],
        "data-space-proportions": squished ? "squished" : "square",
    };
}

export function getTextSizeForSelectableSize(size: SelectableSize): TextSize {
    const mapping: Record<SelectableSize, TextSize> = {
        small: "sm",
        default: "md",
        large: "lg",
    };

    return mapping[size];
}

export function getIconSizeClassNameForSelectableSize(size: SelectableSize): string {
    const mapping: Record<SelectableSize, string> = {
        small: "text-body-xl",
        default: "text-body-3xl",
        large: "text-body-4xl",
    };

    return mapping[size];
}

export function getNextTextSize(size: TextSize, increment: number = 1) {
    const currentIndex = TEXT_SIZES.findIndex((s) => s === size);

    return TEXT_SIZES[clamp(currentIndex + increment, 0, TEXT_SIZES.length)];
}
