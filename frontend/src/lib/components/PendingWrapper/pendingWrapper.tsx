import type React from "react";

import { CircularProgress } from "@lib/components/CircularProgress";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { StatusWrapper } from "../StatusWrapper";

export type PendingWrapperProps = {
    isPending: boolean;
    children: React.ReactNode;
    errorMessage?: string;
    warningMessage?: string;
    infoMessage?: string;
    className?: string;
};

export const PendingWrapper: React.FC<PendingWrapperProps> = (props) => {
    return (
        <StatusWrapper
            errorMessage={props.isPending ? undefined : props.errorMessage}
            warningMessage={props.isPending ? undefined : props.warningMessage}
            infoMessage={props.isPending ? undefined : props.infoMessage}
            className={resolveClassNames("relative", props.className, {
                "outline outline-blue-100 outline-offset-2": props.isPending,
            })}
        >
            {props.isPending && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-20 backdrop-blur-xs">
                    <CircularProgress size="medium-small" />
                </div>
            )}
            {props.children}
        </StatusWrapper>
    );
};
