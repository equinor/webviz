import { CircularProgress } from "@lib/newComponents/CircularProgress";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type OverlayProps = {
    type: "none" | "loading" | "error" | "warning" | "info";
    message?: string;
};

export function Overlay({ type, message }: OverlayProps) {
    if (type === "none") return null;

    let content = null;
    if (type === "loading") {
        content = <CircularProgress size={16} />;
    } else if (message) {
        content = <span className="text-sm">{message}</span>;
    }

    return (
        <div
            className={resolveClassNames(
                "z-overlay bg-surface/10 absolute inset-0 flex h-full w-full items-center justify-center rounded outline-2 backdrop-blur-xs",
                {
                    "outline-danger-subtle": type === "error",
                    "outline-warning-subtle": type === "warning",
                    "outline-info-subtle": type === "info",
                    "outline-neutral-subtle": type === "loading",
                },
            )}
        >
            {content}
        </div>
    );
}
