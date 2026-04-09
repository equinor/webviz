import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type CardProps = {
    tone?: "default" | "warning" | "danger" | "success" | "info";
    elevation?: "none" | "raised" | "overlay";
    children?: React.ReactNode;
};

const DEFAULT_PROPS = {
    tone: "default",
    elevation: "raised",
} satisfies Partial<CardProps>;

const TONE_TO_CLASSNAMES: Record<NonNullable<CardProps["tone"]>, string> = {
    default: "bg-neutral-surface border-neutral-strong",
    warning: "bg-warning-surface border-warning-strong",
    danger: "bg-danger-surface border-danger-strong",
    success: "bg-success-surface border-success-strong",
    info: "bg-info-surface border-info-strong",
};

const ELEVATION_TO_CLASSNAMES: Record<NonNullable<CardProps["elevation"]>, string> = {
    none: "shadow-elevation-none",
    raised: "shadow-elevation-raised",
    overlay: "shadow-elevation-overlay",
};

export function Card(props: CardProps) {
    const defaultedProps = { ...DEFAULT_PROPS, ...props };

    return (
        <div
            className={resolveClassNames(
                "p-vertical-md rounded border",
                TONE_TO_CLASSNAMES[defaultedProps.tone],
                ELEVATION_TO_CLASSNAMES[defaultedProps.elevation],
            )}
        >
            {props.children}
        </div>
    );
}
