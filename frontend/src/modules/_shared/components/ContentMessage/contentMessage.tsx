import type React from "react";

import { Block } from "@mui/icons-material";

import { Typography } from "@lib/components/Typography";

export enum ContentMessageType {
    INFO = "info",
    ERROR = "error",
    WARNING = "warning",
    ACTION_REQUIRED = "action_required",
}

export type ContentMessageProps = {
    type: ContentMessageType;
    children: React.ReactNode;
};

export const ContentMessage: React.FC<ContentMessageProps> = (props) => {
    const tone =
        props.type === ContentMessageType.ERROR || props.type === ContentMessageType.ACTION_REQUIRED
            ? "danger"
            : props.type === ContentMessageType.WARNING
              ? "warning"
              : "info";

    return (
        <Typography
            as="div"
            layoutClassName="flex h-full w-full flex-col items-center justify-center text-center gap-y-2xs"
            size="md"
            tone={tone}
        >
            {props.type === ContentMessageType.ACTION_REQUIRED && <Block fontSize="large" />}
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

export type ContentActionRequiredProps = {
    children: React.ReactNode;
};

export const ContentActionRequired: React.FC<ContentActionRequiredProps> = (props) => {
    return <ContentMessage type={ContentMessageType.ACTION_REQUIRED}>{props.children}</ContentMessage>;
};

ContentActionRequired.displayName = "ContentActionRequired";

export type ContentInfoProps = {
    children: React.ReactNode;
};

export const ContentInfo: React.FC<ContentInfoProps> = (props) => {
    return <ContentMessage type={ContentMessageType.INFO}>{props.children}</ContentMessage>;
};

ContentInfo.displayName = "ContentInfo";
