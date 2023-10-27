import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type StateWrapperProps = {
    isUnexpectedState: boolean;
    unexpectedStateComponent: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    children: React.ReactNode;
};

export const StateWrapper: React.FC<StateWrapperProps> = (props: StateWrapperProps) => {
    return (
        <div className={resolveClassNames("relative rounded", props.className ?? "")} style={props.style}>
            {props.isUnexpectedState && (
                <div className="absolute left-0 right-0 w-full h-full bg-white bg-opacity-80 flex items-center justify-center z-10">
                    {props.unexpectedStateComponent}
                </div>
            )}
            {props.children}
        </div>
    );
};

StateWrapper.displayName = "StateWrapper";

export type LoadingStateWrapperProps = {
    isLoading: boolean;
    loadingComponent: React.ReactNode;
} & Omit<StateWrapperProps, "isUnexpectedState" | "unexpectedStateComponent">;

export const LoadingStateWrapper: React.FC<LoadingStateWrapperProps> = (props: LoadingStateWrapperProps) => {
    return (
        <StateWrapper
            isUnexpectedState={props.isLoading}
            unexpectedStateComponent={props.loadingComponent}
            className={resolveClassNames(
                { "outline outline-blue-100 outline-offset-2": props.isLoading },
                props.className ?? ""
            )}
            style={props.style}
        >
            {props.children}
        </StateWrapper>
    );
};

LoadingStateWrapper.displayName = "LoadingStateWrapper";

export type ErrorStateWrapperProps = {
    isError: boolean;
    errorComponent: React.ReactNode;
} & Omit<StateWrapperProps, "isUnexpectedState" | "unexpectedStateComponent">;

export const ErrorStateWrapper: React.FC<ErrorStateWrapperProps> = (props: ErrorStateWrapperProps) => {
    return (
        <StateWrapper
            isUnexpectedState={props.isError}
            unexpectedStateComponent={props.errorComponent}
            className={resolveClassNames(
                { "outline outline-red-100 outline-offset-2": props.isError },
                props.className ?? ""
            )}
            style={props.style}
        >
            {props.children}
        </StateWrapper>
    );
};

ErrorStateWrapper.displayName = "ErrorStateWrapper";
