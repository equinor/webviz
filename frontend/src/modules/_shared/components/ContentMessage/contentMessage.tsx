import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

export enum ContentMessageType {
    INFO = "info",
    ERROR = "error",
    WARNING = "warning",
}

export type ContentMessageProps = {
    type: ContentMessageType;
    children: React.ReactNode;
};

export const ContentMessage: React.FC<ContentMessageProps> = (props) => {
    return (
        <div
            className={resolveClassNames("w-full h-full flex items-center justify-center flex-col", {
                "text-red-700": props.type === "error",
                "text-yellow-600": props.type === "warning",
            })}
        >
            {props.children}
        </div>
    );
};

ContentMessage.displayName = "ContentMessage";

export type ContentErrorProps = {
    children: React.ReactNode;
};

export const ContentError: React.FC<ContentErrorProps> = (props) => {
    return <ContentMessage type={ContentMessageType.ERROR}>{props.children}</ContentMessage>;
};

ContentError.displayName = "ContentError";

export type ContentWarningProps = {
    children: React.ReactNode;
};

export const ContentWarning: React.FC<ContentWarningProps> = (props) => {
    return <ContentMessage type={ContentMessageType.WARNING}>{props.children}</ContentMessage>;
};

ContentError.displayName = "ContentWarning";

export type ContentInfoProps = {
    children: React.ReactNode;
};

export const ContentInfo: React.FC<ContentInfoProps> = (props) => {
    return <ContentMessage type={ContentMessageType.INFO}>{props.children}</ContentMessage>;
};

ContentInfo.displayName = "ContentInfo";
