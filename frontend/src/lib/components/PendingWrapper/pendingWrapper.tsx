import React from "react";

import { CircularProgress } from "@lib/components/CircularProgress";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

// Base state wrapper props
export type PendingWrapperProps = {
    isPending: boolean;
    children: React.ReactNode;
};

export const PendingWrapper: React.FC<PendingWrapperProps> = (props) => {
    return (
        <div
            className={resolveClassNames("relative rounded", {
                "outline outline-blue-100 outline-offset-2": props.isPending,
            })}
        >
            {props.isPending && (
                <div className="absolute left-0 right-0 w-full h-full bg-white bg-opacity-80 flex items-center justify-center z-10">
                    <CircularProgress />
                </div>
            )}
            {props.children}
        </div>
    );
};
