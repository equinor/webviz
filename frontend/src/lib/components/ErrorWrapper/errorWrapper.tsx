import type React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type ErrorWrapperProps = {
    isError?: boolean;
    message?: string;
    children: React.ReactNode;
};

export const ErrorWrapper: React.FC<ErrorWrapperProps> = (props) => {
    return (
        <div
            className={resolveClassNames("relative rounded", {
                "outline outline-red-100 outline-offset-2": props.isError ?? false,
            })}
        >
            {props.isError && props.message && (
                <div className="absolute left-0 right-0 w-full h-full bg-white bg-opacity-80 flex items-center justify-center z-10 p-4 text-center backdrop-blur-sm">
                    {props.message}
                </div>
            )}
            {props.children}
        </div>
    );
};
