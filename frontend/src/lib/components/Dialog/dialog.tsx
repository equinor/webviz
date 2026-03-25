import React from "react";

import { Close } from "@mui/icons-material";

import { createPortal } from "@lib/utils/createPortal";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type DialogVariant = "error" | "info";

export type DialogDrawerProps = {
    content?: React.ReactNode;
    width?: string | number;
    maxWidth?: string | number;
    open: boolean;
    onClose: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
};

export type DialogProps = {
    title?: string | React.ReactNode;
    children?: React.ReactNode;
    modal?: boolean;
    open?: boolean;
    onClose?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
    width?: string | number;
    height?: string | number;
    maxWidth?: string | number;
    maxHeight?: string | number;
    minWidth?: string | number;
    minHeight?: string | number;
    actions?: React.ReactNode;
    showCloseCross?: boolean;
    drawer?: DialogDrawerProps;
    zIndex?: number;
    variant?: DialogVariant;
};

export const Dialog: React.FC<DialogProps> = (props) => {
    const wrapperRef = React.useRef<HTMLDivElement>(null);
    const dialogRef = React.useRef<HTMLDivElement>(null);

    const variantOrDefault = props.variant ?? "info";

    const handleClose = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        props.onClose?.(e);
    };

    const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target !== wrapperRef.current) {
            return;
        }
        handleClose(e);
    };

    return createPortal(
        <div
            ref={wrapperRef}
            className={resolveClassNames("fixed inset-0 h-full w-full", {
                "pointer-events-none": !props.modal,
                "bg-backdrop": props.modal,
                hidden: !props.open,
            })}
            style={{ zIndex: props.zIndex ?? 50 }}
            onClick={handleBackgroundClick}
        >
            {/* Main dialog */}
            <div
                ref={dialogRef}
                className={resolveClassNames(
                    "bg-floating pointer-events-auto fixed top-1/2 left-1/2 flex max-w-[75vw] min-w-lg flex-col overflow-hidden rounded-sm shadow-sm",
                    { border: !props.modal },
                )}
                style={{
                    transform: `translate(-50%, -50%)`,
                    height: props.height,
                    width: props.width,
                    minWidth: props.minWidth,
                    minHeight: props.minHeight,
                    maxWidth: props.maxWidth,
                    maxHeight: props.maxHeight,
                }}
            >
                {/* Header */}
                <div
                    className={resolveClassNames("flex justify-between border-b p-4", {
                        "border-red-400 bg-red-200": variantOrDefault === "error",
                    })}
                >
                    <h2
                        className={resolveClassNames("text-lg font-bold text-slate-800", {
                            "text-red-900!": variantOrDefault === "error",
                        })}
                    >
                        {props.title}
                    </h2>
                    {props.showCloseCross && (
                        <div
                            className="ml-4 cursor-pointer hover:text-slate-500"
                            onClick={handleClose}
                            title="Close dialog"
                        >
                            <Close width={24} />
                        </div>
                    )}
                </div>

                {/* Body */}
                <div className="relative flex h-full flex-col overflow-hidden">
                    {/* Main content */}
                    <div className="grow overflow-auto p-4">{props.children}</div>

                    {/* Actions */}
                    {props.actions && (
                        <div className="mt-4 flex justify-end gap-2 bg-slate-100 p-4">{props.actions}</div>
                    )}

                    {/* Drawer overlay + content */}
                    {props.drawer && (
                        <>
                            {/* Semi-transparent overlay*/}
                            {props.drawer.open && (
                                <div
                                    className="absolute top-0 left-0 z-10 h-full w-full bg-black/25"
                                    onClick={props.drawer.onClose}
                                />
                            )}

                            {/* Drawer content */}
                            <div
                                className={resolveClassNames(
                                    "absolute top-0 left-0 z-20 h-full bg-white pl-2 shadow-lg transition-transform duration-300",
                                    {
                                        "translate-x-0": props.drawer.open,
                                        "-translate-x-full": !props.drawer.open,
                                    },
                                )}
                                style={{
                                    width: props.drawer.width ?? "99%",
                                    maxWidth: props.drawer.maxWidth ?? "99%",
                                }}
                            >
                                {props.drawer.content}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>,
    );
};
