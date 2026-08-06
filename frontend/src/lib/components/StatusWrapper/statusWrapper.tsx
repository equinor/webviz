import React from "react";

import { CircularProgress } from "@lib/components/CircularProgress";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type StatusWrapperProps = {
    /** The content to wrap and optionally overlay with a status indicator. */
    children: React.ReactNode;
    /** When set, shows an error message overlay with a red outline. Takes priority over warning and info. */
    errorMessage?: string;
    /** When set, shows a warning message overlay with an orange outline. */
    warningMessage?: string;
    /** When set, shows an info message overlay with a neutral outline. */
    infoMessage?: string;
    /** When true, shows a loading spinner overlay and makes the wrapped content inert. */
    isPending?: boolean;
    /** Additional CSS class names applied to the root element. */
    className?: string;
};

export const StatusWrapper = React.forwardRef<HTMLDivElement, StatusWrapperProps>(function StatusWrapper(props, ref) {
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
            ref={ref}
            className={resolveClassNames("relative rounded", props.className, {
                [`outline outline-offset-2 ${outlineColorClass}`]: Boolean(activeMessage || props.isPending),
            })}
        >
            {props.isPending && (
                <div className="z-overlay bg-surface/80 absolute inset-0 flex items-center justify-center backdrop-blur-xs">
                    <CircularProgress size={24} />
                </div>
            )}
            {activeMessage && (
                <div className="z-overlay bg-surface/80 px-xs py-xs absolute right-0 left-0 flex h-full w-full items-center justify-center text-center backdrop-blur-xs">
                    {activeMessage}
                </div>
            )}
            <div
                style={{ display: "contents" }}
                ref={(el) => {
                    if (el) el.inert = Boolean(activeMessage || props.isPending);
                }}
            >
                {props.children}
            </div>
        </div>
    );
});
