import React from "react";

import { ClickAwayListener } from "@mui/base";
import { Close, Error, Help, Info, Warning } from "@mui/icons-material";

import { createPortal } from "@lib/utils/createPortal";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { CircularProgress } from "../CircularProgress";
import { DenseIconButton } from "../DenseIconButton";

export type SettingAnnotation = {
    type: "warning" | "info" | "error";
    message: string;
};

type PlainAnnotationStrings = {
    errorAnnotation?: string;
    warningAnnotation?: string;
    infoAnnotation?: string;
};

export type Help = {
    title: string;
    content: React.ReactNode;
};

export type SettingWrapperProps = {
    children: React.ReactElement;
    errorOverlay?: string;
    warningOverlay?: string;
    infoOverlay?: string;
    loadingOverlay?: boolean;
    label?: React.ReactNode;
    help?: Help;
} & (
    | {
          annotations?: SettingAnnotation[];
      }
    | PlainAnnotationStrings
);

function isNotAnnotationList(props: SettingWrapperProps): props is SettingWrapperProps & PlainAnnotationStrings {
    return !Array.isArray((props as any).annotations);
}

export function SettingWrapper(props: SettingWrapperProps) {
    const id = React.useId();

    const annotations: SettingAnnotation[] = isNotAnnotationList(props)
        ? ([
              props.errorAnnotation && { type: "error", message: props.errorAnnotation },
              props.warningAnnotation && { type: "warning", message: props.warningAnnotation },
              props.infoAnnotation && { type: "info", message: props.infoAnnotation },
          ].filter(Boolean) as SettingAnnotation[])
        : (props.annotations ?? []);

    let overlayType: SettingOverlayProps["type"] = "none";
    if (props.loadingOverlay) {
        overlayType = "loading";
    } else if (props.errorOverlay) {
        overlayType = "error";
    } else if (props.warningOverlay) {
        overlayType = "warning";
    } else if (props.infoOverlay) {
        overlayType = "info";
    }

    return (
        <div className="flex flex-col gap-1">
            {props.label && (
                <div className="flex items-center justify-between gap-2">
                    <label className="text-sm text-gray-500 leading-tight" htmlFor={id}>
                        {props.label}
                    </label>
                    {props.help && <SettingHelp title={props.help.title} content={props.help.content} />}
                </div>
            )}
            <div className="relative">
                {React.cloneElement(props.children, { id })}
                <SettingOverlay
                    type={overlayType}
                    message={props.errorOverlay ?? props.warningOverlay ?? props.infoOverlay}
                />
            </div>
            <SettingAnnotations annotations={annotations} />
        </div>
    );
}

type SettingOverlayProps = {
    type: "none" | "loading" | "error" | "warning" | "info";
    message?: string;
};

function SettingOverlay({ type, message }: SettingOverlayProps) {
    if (type === "none") return null;

    let content = null;
    if (type === "loading") {
        content = <CircularProgress size="small" />;
    } else if (message) {
        content = <span className="text-sm">{message}</span>;
    }

    return (
        <div
            className={resolveClassNames(
                "absolute inset-0 h-full w-full bg-white/6 rounded-sm flex items-center justify-center outline-2 backdrop-blur-xs",
                {
                    "outline-red-200": type === "error",
                    "outline-orange-200": type === "warning",
                    "outline-blue-200": type === "info",
                    "outline-gray-200": type === "loading",
                },
            )}
        >
            {content}
        </div>
    );
}

function SettingAnnotations({ annotations }: { annotations: SettingAnnotation[] }) {
    return (
        <>
            {annotations.map((a, i) => (
                <div
                    key={i}
                    className={resolveClassNames("flex gap-2 items-center text-sm", {
                        "text-red-600": a.type === "error",
                        "text-yellow-600": a.type === "warning",
                        "text-blue-600": a.type === "info",
                    })}
                >
                    <SettingAnnotationIcon type={a.type} />
                    {a.message}
                </div>
            ))}
        </>
    );
}

export function SettingAnnotationIcon(props: { type: SettingAnnotation["type"] }) {
    switch (props.type) {
        case "warning":
            return <Warning fontSize="inherit" />;
        case "info":
            return <Info fontSize="inherit" />;
        case "error":
            return <Error fontSize="inherit" />;
        default:
            return null;
    }
}

type SettingHelp = {
    title: string;
    content: React.ReactNode;
};

function SettingHelp(props: SettingHelp) {
    const [isOpen, setIsOpen] = React.useState(false);

    const anchorRef = React.useRef<HTMLButtonElement>(null);
    const dialogRef = React.useRef<HTMLDivElement>(null);

    const handleOpenClick = React.useCallback(function handleOpenClick() {
        setIsOpen(true);
    }, []);

    const handleClose = React.useCallback(function handleClose() {
        setIsOpen(false);
    }, []);

    let dialogContent = null;

    if (isOpen) {
        // Position relative to anchor element
        const rect = anchorRef.current?.getBoundingClientRect();
        const style: React.CSSProperties = {
            top: rect ? rect.bottom + 4 : 100,
            left: rect ? rect.left : 100,
        };

        dialogContent = (
            <ClickAwayListener onClickAway={handleClose}>
                <div
                    ref={dialogRef}
                    style={style}
                    className="fixed bg-white border border-gray-200 rounded-sm shadow-md max-w-sm z-[999] flex flex-col gap-2"
                >
                    <div className="flex justify-between items-center p-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-800">{props.title}</h3>
                        <DenseIconButton onClick={handleClose} title="Close">
                            <Close fontSize="inherit" />
                        </DenseIconButton>
                    </div>
                    <div className="p-4 text-sm text-gray-700">{props.content}</div>
                </div>
            </ClickAwayListener>
        );
    }

    return (
        <>
            <DenseIconButton title="Show help" ref={anchorRef} onClick={handleOpenClick}>
                <Help fontSize="inherit" color="info" />
            </DenseIconButton>
            {dialogContent && createPortal(dialogContent)}
        </>
    );
}
