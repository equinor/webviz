import { clamp } from "lodash";

export const SIZE_NAMES = ["extra-small", "small", "medium-small", "medium", "large"] as const;
export type SizeName = (typeof SIZE_NAMES)[any];

export function getSizeClass(size: SizeName) {
    switch (size) {
        case "extra-small":
            return "size-3";
        case "small":
            return "size-4";
        case "medium-small":
            return "size-5";
        case "medium":
            return "size-8";
        case "large":
            return "size-12";
    }
}

export function getTextSizeClassName(size: SizeName, offset = 0) {
    if (offset !== 0) {
        const sizeIndex = SIZE_NAMES.indexOf(size);
        size = SIZE_NAMES[clamp(sizeIndex + offset, 0, SIZE_NAMES.length - 1)];
    }

    switch (size) {
        case "extra-small":
            return "text-xs";
        case "small":
            return "text-sm";
        case "medium-small":
            // There's not really any fitting class for this one, so we make a custom one
            return "text-[0.9375rem]";
        case "medium":
            return "text-base";
        case "large":
            return "text-lg";
    }
}
