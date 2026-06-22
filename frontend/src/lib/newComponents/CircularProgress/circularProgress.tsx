import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { PIXEL_SIZES_CLASSNAMES, type PixelSize } from "../_shared/utils/size";
import type { LayoutClassProps } from "../_shared/utils/wrapperProps";

export type CircularProgressProps = {
    /** Size of the spinner in pixels. @default 48 */
    size?: PixelSize;
    /** Color scheme of the spinner. @default "default" */
    tone?: "default" | "on-emphasis";
    /** Whether the spinner animates continuously or tracks a specific value. @default "indeterminate" */
    variant?: "indeterminate" | "determinate";
    /** The current progress value (0–100). Only used when `variant` is "determinate". */
    value?: number;
} & LayoutClassProps;

const TONE_CLASSNAMES: Record<NonNullable<CircularProgressProps["tone"]>, { track: string; progress: string }> = {
    default: { track: "stroke-accent", progress: "stroke-accent-strong" },
    "on-emphasis": { track: "stroke-neutral", progress: "stroke-surface" },
};

// Circle: cx=48, cy=48, r=22 inside viewBox="22 22 52 52"
const CIRCUMFERENCE = 2 * Math.PI * 22;

export function CircularProgress(props: CircularProgressProps) {
    const { size = 48, tone = "default", variant = "indeterminate" } = props;

    const toneClasses = TONE_CLASSNAMES[tone];
    const isIndeterminate = variant === "indeterminate";
    const clampedValue = Math.min(100, Math.max(0, props.value ?? 0));
    const strokeDashoffset = CIRCUMFERENCE * (1 - clampedValue / 100);

    return (
        <svg
            aria-hidden="true"
            role="progressbar"
            aria-valuenow={isIndeterminate ? undefined : clampedValue}
            aria-valuemin={isIndeterminate ? undefined : 0}
            aria-valuemax={isIndeterminate ? undefined : 100}
            className={resolveClassNames(
                { "animate-spin [animation-duration:1.4s]": isIndeterminate },
                PIXEL_SIZES_CLASSNAMES[size],
                props.layoutClassName,
            )}
            /* Avoid using viewBox="0 0 100 100" to prevent blurriness */
            viewBox="22 22 52 52"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <circle cx="48" cy="48" r="18" fill="none" strokeWidth="4" className={toneClasses.track} />
            <circle
                cx="48"
                cy="48"
                r="18"
                fill="none"
                strokeLinecap="round"
                strokeWidth="4"
                strokeDasharray={isIndeterminate ? 48 : CIRCUMFERENCE}
                strokeDashoffset={isIndeterminate ? undefined : strokeDashoffset}
                style={isIndeterminate ? undefined : { transition: "stroke-dashoffset 0.2s ease" }}
                transform={isIndeterminate ? undefined : "rotate(-90 48 48)"}
                className={toneClasses.progress}
            />
        </svg>
    );
}
