import React from "react";

import { withDefaults } from "@lib/components/_shared/utils/defaultProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { SelectableSize } from "../_shared/utils/size";
import type { LayoutClassProps } from "../_shared/utils/wrapperProps";

export type LinearProgressProps = {
    /** Whether the progress bar animates continuously or tracks a specific value. @default "indeterminate" */
    variant?: "indeterminate" | "determinate";
    /** The current progress value (0–100). Only used when `variant` is "determinate". */
    value?: number;
    /** Color scheme of the progress bar. @default "default" */
    tone?: "default" | "on-emphasis";
    /**
     * The size of the progress bar. @default "default"
     * - "small": A thinner progress bar, suitable for tight spaces or subtle progress indication.
     * - "default": The standard size for most use cases, providing a good balance of visibility and space efficiency.
     * - "large": A thicker progress bar, ideal for situations where you want to emphasize the progress or have more space available.
     */
    size?: SelectableSize;
} & LayoutClassProps;

const DEFAULT_PROPS = {
    variant: "indeterminate",
    size: "default",
    tone: "default",
} satisfies Partial<LinearProgressProps>;

export const LinearProgress = React.forwardRef<HTMLDivElement, LinearProgressProps>(
    function LinearProgress(props, ref) {
        const defaultedProps = withDefaults(props, DEFAULT_PROPS);

        if (defaultedProps.variant === "indeterminate") {
            return (
                <IndefiniteLinearProgress
                    ref={ref}
                    className={defaultedProps.layoutClassName}
                    style={defaultedProps.layoutStyle}
                    size={defaultedProps.size}
                    tone={defaultedProps.tone}
                />
            );
        }

        return (
            <DeterminateLinearProgress
                ref={ref}
                value={defaultedProps.value ?? 0}
                className={defaultedProps.layoutClassName}
                style={defaultedProps.layoutStyle}
                size={defaultedProps.size}
                tone={defaultedProps.tone}
            />
        );
    },
);

const SIZE_TO_CLASSNAMES: Record<NonNullable<LinearProgressProps["size"]>, string> = {
    small: "h-0.5",
    default: "h-1",
    large: "h-2",
};

const TONE_CLASSNAMES: Record<NonNullable<LinearProgressProps["tone"]>, { track: string; progress: string }> = {
    default: { track: "bg-accent", progress: "bg-accent-strong" },
    "on-emphasis": { track: "bg-neutral", progress: "bg-surface" },
};

type InnerProgressProps = {
    ref: React.Ref<HTMLDivElement>;
    className?: string;
    style?: React.CSSProperties;
    size: NonNullable<LinearProgressProps["size"]>;
    tone: NonNullable<LinearProgressProps["tone"]>;
};

function IndefiniteLinearProgress(props: InnerProgressProps) {
    const { className, style, size, tone } = props;
    return (
        <div
            ref={props.ref}
            aria-label="Progress bar"
            role="progressbar"
            style={style}
            className={resolveClassNames(
                "relative w-full overflow-hidden rounded",
                TONE_CLASSNAMES[tone].track,
                SIZE_TO_CLASSNAMES[size],
                className,
            )}
        >
            <div
                className={resolveClassNames(
                    TONE_CLASSNAMES[tone].progress,
                    "animate-linear-indefinite absolute top-0 h-full w-3/4",
                )}
            />
        </div>
    );
}

type DeterminateLinearProgressProps = InnerProgressProps & {
    value: number;
};

function DeterminateLinearProgress(props: DeterminateLinearProgressProps) {
    const { value, className, style, size, tone } = props;
    return (
        <div
            ref={props.ref}
            aria-label="Progress bar"
            role="progressbar"
            style={style}
            className={resolveClassNames(
                "relative w-full overflow-hidden rounded",
                TONE_CLASSNAMES[tone].track,
                SIZE_TO_CLASSNAMES[size],
                className,
            )}
            aria-valuenow={value}
            aria-valuemin={0}
            aria-valuemax={100}
        >
            <div
                className={resolveClassNames(TONE_CLASSNAMES[tone].progress, "absolute top-0 h-full")}
                style={{ width: `${value}%`, transition: "width 0.2s ease" }}
            />
        </div>
    );
}
