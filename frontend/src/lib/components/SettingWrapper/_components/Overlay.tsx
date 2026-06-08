import { CircularProgress } from "@lib/newComponents/CircularProgress";
import { Tooltip } from "@lib/newComponents/Tooltip";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type OverlayProps = {
    type: "none" | "loading" | "error" | "warning" | "info";
    message?: string;
};

export function Overlay({ type, message }: OverlayProps) {
    if (type === "none") return null;

    return (
        <div
            className={resolveClassNames(
                "z-overlay bg-surface/10 absolute inset-0 flex h-full w-full items-center justify-center rounded text-center outline-2 backdrop-blur-xs",
                {
                    "outline-danger-subtle text-danger-subtle": type === "error",
                    "outline-warning-subtle text-warning-subtle": type === "warning",
                    "outline-info-subtle text-info-subtle": type === "info",
                    "outline-neutral-subtle text-neutral-subtle": type === "loading",
                },
            )}
        >
            <Tooltip content={message ?? "Loading..."} side="bottom">
                <span className="gap-horizontal-xs px-horizontal-xs flex w-full items-center justify-center">
                    {type === "loading" && <span className="shrink-0"><CircularProgress size={16} /></span>}
                    {message && <span className="min-w-0 truncate text-sm">{message}</span>}
                </span>
            </Tooltip>
        </div>
    );
}
