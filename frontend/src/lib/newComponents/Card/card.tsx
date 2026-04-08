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
    default: "bg-fill-neutral-surface border-stroke-default-strong",
    warning: "bg-fill-warning-surface border-stroke-warning-strong",
    danger: "bg-fill-danger-surface border-stroke-danger-strong",
    success: "bg-fill-success-surface border-stroke-success-strong",
    info: "bg-fill-info-surface border-stroke-info-str",
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
                "p-space-sm rounded border",
                TONE_TO_CLASSNAMES[defaultedProps.tone],
                ELEVATION_TO_CLASSNAMES[defaultedProps.elevation],
            )}
        >
            {props.children}
        </div>
    );
}
