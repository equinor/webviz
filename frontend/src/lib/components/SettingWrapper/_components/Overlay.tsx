import { CircularProgress } from "@lib/components/CircularProgress";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type OverlayProps = {
    type: "none" | "loading" | "error" | "warning" | "info";
    message?: string;
};

export function Overlay({ type, message }: OverlayProps) {
    if (type === "none") return null;

    let content = null;
    if (type === "loading") {
        content = <CircularProgress size="small" />;
    } else if (message) {
        content = <span className="text-sm">{message}</span>;
    }

    return (
        <div
            className={resolveClassNames(
                "absolute inset-0 h-full w-full bg-white/6 rounded-sm flex items-center justify-center outline-2 backdrop-blur-xs z-10",
                {
                    "outline-red-200": type === "error",
                    "outline-orange-200": type === "warning",
                    "outline-blue-200": type === "info",
                    "outline-gray-200": type === "loading",
                },
            )}
        >
            {content}
        </div>
    );
}
