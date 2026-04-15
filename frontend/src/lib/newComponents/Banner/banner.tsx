import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type BannerProps = {
    tone?: "warning" | "danger" | "success" | "info";
    children?: React.ReactNode;
};

const DEFAULT_PROPS = {
    tone: "info",
} satisfies Partial<BannerProps>;

const TONE_TO_CLASSNAMES: Record<NonNullable<Exclude<BannerProps["tone"], "default">>, string> = {
    warning: "bg-warning-surface border-warning-strong",
    danger: "bg-danger-surface border-danger-strong",
    success: "bg-success-surface border-success-strong",
    info: "bg-info-surface border-info-strong",
};

export function Banner(props: BannerProps) {
    const defaultedProps = { ...DEFAULT_PROPS, ...props };

    return (
        <div className={resolveClassNames("p-vertical-md rounded border", TONE_TO_CLASSNAMES[defaultedProps.tone])}>
            {props.children}
        </div>
    );
}
