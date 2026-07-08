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
