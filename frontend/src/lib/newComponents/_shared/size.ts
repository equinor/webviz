export type PixelSize = 16 | 24 | 32 | 40 | 48;

export const PIXEL_SIZES_CLASSNAMES: Record<PixelSize, string> = {
    16: "aspect-square h-4",
    24: "aspect-square h-6",
    32: "aspect-square h-8",
    40: "aspect-square h-10",
    48: "aspect-square h-12",
};

export type SelectableSize = "small" | "default" | "large";

export const SELECTABLE_SIZES_CLASSNAMES: Record<SelectableSize, string> = {
    small: "h-selectable-sm text-body-sm",
    default: "h-selectable-md text-body-md",
    large: "h-selectable-lg text-body-lg",
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
