import type React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type StatusWrapperProps = {
    children: React.ReactNode;
    errorMessage?: string;
    warningMessage?: string;
    infoMessage?: string;
    className?: string;
};

export const StatusWrapper: React.FC<StatusWrapperProps> = (props) => {
    const activeMessage = props.errorMessage ?? props.warningMessage ?? props.infoMessage;

    return (
        <div
            className={resolveClassNames("relative rounded-sm", props.className, {
                "outline outline-offset-2": Boolean(activeMessage),
                "outline-danger": Boolean(props.errorMessage),
                "outline-warning": Boolean(props.warningMessage && !props.errorMessage),
                "outline-neutral": Boolean(props.infoMessage && !props.errorMessage && !props.warningMessage),
            })}
        >
            {activeMessage && (
                <div className="z-overlay bg-surface/80 px-horizontal-xs py-vertical-xs absolute right-0 left-0 flex h-full w-full items-center justify-center text-center backdrop-blur-xs">
                    {activeMessage}
                </div>
            )}
            {props.children}
        </div>
    );
};
