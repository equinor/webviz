import type React from "react";

import { Typography } from "@lib/newComponents/Typography";

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
    const tone =
        props.type === ContentMessageType.ERROR
            ? "danger"
            : props.type === ContentMessageType.WARNING
              ? "warning"
              : "info";

    return (
        <Typography
            layoutClassName="flex h-full w-full flex-col items-center justify-center text-center"
            size="md"
            tone={tone}
        >
            {props.children}
        </Typography>
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
