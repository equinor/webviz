import type React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { CircularProgress } from "@lib/newComponents/CircularProgress";

export type StatusWrapperProps = {
    children: React.ReactNode;
    errorMessage?: string;
    warningMessage?: string;
    infoMessage?: string;
    isPending?: boolean;
    className?: string;
};

export const StatusWrapper: React.FC<StatusWrapperProps> = (props) => {
    const activeMessage = !props.isPending && (props.errorMessage ?? props.warningMessage ?? props.infoMessage);

    let outlineColorClass = "";
    if (props.isPending) {
        outlineColorClass = "outline-neutral";
    } else if (props.errorMessage) {
        outlineColorClass = "outline-danger";
    } else if (props.warningMessage) {
        outlineColorClass = "outline-warning";
    } else if (props.infoMessage) {
        outlineColorClass = "outline-neutral";
    }

    return (
        <div
            className={resolveClassNames("relative rounded-sm", props.className, {
                [`outline outline-offset-2 ${outlineColorClass}`]: Boolean(activeMessage || props.isPending),
            })}
        >
            {props.isPending && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-xs">
                    <CircularProgress size={24} />
                </div>
            )}
            {activeMessage && (
                <div className="z-overlay bg-surface/80 px-horizontal-xs py-vertical-xs absolute right-0 left-0 flex h-full w-full items-center justify-center text-center backdrop-blur-xs">
                    {activeMessage}
                </div>
            )}
            <div style={{ display: "contents" }} ref={(el) => { if (el) el.inert = Boolean(activeMessage || props.isPending); }}>{props.children}</div>
        </div>
    );
};
