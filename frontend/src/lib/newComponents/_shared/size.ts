export type PixelSize = 16 | 24 | 32 | 40 | 48;

export const PIXEL_SIZES_CLASSNAMES: Record<PixelSize, string> = {
    16: "aspect-square h-4",
    24: "aspect-square h-6",
    32: "aspect-square h-8",
    40: "aspect-square h-10",
    48: "aspect-square h-12",
};
