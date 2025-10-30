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
                " outline-red-200": Boolean(props.errorMessage),
                " outline-yellow-200": Boolean(props.warningMessage && !props.errorMessage),
                " outline-slate-200": Boolean(props.infoMessage && !props.errorMessage && !props.warningMessage),
            })}
        >
            {activeMessage && (
                <div className="absolute left-0 right-0 w-full h-full bg-white/80 flex items-center justify-center z-10 p-4 text-center backdrop-blur-xs">
                    {activeMessage}
                </div>
            )}
            {props.children}
        </div>
    );
};
