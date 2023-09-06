import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { QueryObserverResult } from "@tanstack/react-query";

export type ApiStatesWrapperProps = {
    apiResults: QueryObserverResult[];
    loadingComponent: React.ReactNode;
    errorComponent: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    children: React.ReactNode;
};

export const ApiStatesWrapper: React.FC<ApiStatesWrapperProps> = (props: ApiStatesWrapperProps) => {
    return (
        <div
            className={resolveClassNames(
                "relative rounded",
                { "outline outline-blue-100 outline-offset-2": props.apiResults.some((elm) => elm.isLoading) },
                { "outline outline-red-100 outline-offset-2": props.apiResults.some((elm) => elm.isError) },
                props.className ?? ""
            )}
            style={props.style}
        >
            {props.apiResults.some((elm) => elm.isLoading) && (
                <div className="absolute left-0 right-0 w-full h-full bg-white bg-opacity-80 flex items-center justify-center z-10">
                    {props.loadingComponent}
                </div>
            )}
            {props.apiResults.some((elm) => elm.isError) && (
                <div className="absolute left-0 right-0 w-full h-full bg-white bg-opacity-80 flex items-center justify-center z-10">
                    {props.errorComponent}
                </div>
            )}
            {props.children}
        </div>
    );
};

ApiStatesWrapper.displayName = "ApiStatesWrapper";
