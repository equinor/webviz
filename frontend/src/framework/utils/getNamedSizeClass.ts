export type SizeName = "extra-small" | "small" | "medium-small" | "medium" | "large";

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
