import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { PIXEL_SIZES_CLASSNAMES, type PixelSize } from "../_shared/size";

export type CircularProgressProps = {
    size?: PixelSize;
    tone?: "default" | "on-emphasis";
    variant?: "indeterminate" | "determinate";
    value?: number;
};

const DEFAULT_PROPS = {
    size: 48,
    tone: "default",
    variant: "indeterminate",
} satisfies Partial<CircularProgressProps>;

const TONE_CLASSNAMES: Record<NonNullable<CircularProgressProps["tone"]>, { track: string; progress: string }> = {
    default: { track: "stroke-accent", progress: "stroke-accent-strong" },
    "on-emphasis": { track: "stroke-neutral", progress: "stroke-surface" },
};

export function CircularProgress(props: CircularProgressProps) {
    const defaultedProps = { ...DEFAULT_PROPS, ...props };
    const toneClasses = TONE_CLASSNAMES[defaultedProps.tone];

    return (
        <svg
            aria-hidden="true"
            role="progressbar"
            className={resolveClassNames(
                "animate-spin [animation-duration:1.4s]",
                PIXEL_SIZES_CLASSNAMES[defaultedProps.size],
            )}
            /* Avoid using viewBox="0 0 100 100" to prevent blurriness */
            viewBox="22 22 52 52"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <circle cx="48" cy="48" r="22" fill="none" strokeWidth="4" className={toneClasses.track}></circle>
            <circle
                cx="48"
                cy="48"
                r="22"
                fill="none"
                strokeLinecap="round"
                strokeWidth="4"
                strokeDasharray="48"
                className={toneClasses.progress}
            ></circle>
        </svg>
    );
}
