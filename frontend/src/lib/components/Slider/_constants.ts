export const TRACK_CLASS_NAME =
    "not-data-disabled:group-hover/slider-comp:bg-neutral-hover data-dragging:bg-neutral-hover bg-canvas";
export const INDICATOR_CLASS_NAME = "bg-accent-strong data-disabled:bg-disabled";
export const TRACK_HEIGHT_CLASS_NAMES = {
    // Same size for small and default, as h-0.5 seems way to small
    small: "h-1",
    default: "h-1",
    large: "h-1.5",
} as const;
