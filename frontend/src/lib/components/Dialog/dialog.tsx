import React from "react";

import { Close } from "@mui/icons-material";

import { createPortal } from "@lib/utils/createPortal";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type DialogDrawerProps = {
    content: React.ReactNode;
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
};

export const Dialog: React.FC<DialogProps> = (props) => {
    const wrapperRef = React.useRef<HTMLDivElement>(null);
    const dialogRef = React.useRef<HTMLDivElement>(null);

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
            className={resolveClassNames("fixed inset-0 w-full h-full z-50", {
                "pointer-events-none": !props.modal,
                "bg-slate-600/50": props.modal,
                hidden: !props.open,
            })}
            onClick={handleBackgroundClick}
        >
            {/* Main dialog */}
            <div
                ref={dialogRef}
                className={
                    "fixed left-1/2 top-1/2 border rounded-sm bg-white shadow-sm min-w-lg max-w-[75vw] pointer-events-auto flex flex-col overflow-hidden"
                }
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
                <div className="flex justify-between p-4 border-b shadow-inner">
                    <h2 className="text-slate-800 font-bold text-lg">{props.title}</h2>
                    {props.showCloseCross && (
                        <div
                            className="hover:text-slate-500 cursor-pointer ml-4"
                            onClick={handleClose}
                            title="Close dialog"
                        >
                            <Close width={24} />
                        </div>
                    )}
                </div>

                {/* Body */}
                <div className="flex flex-col h-full relative overflow-hidden">
                    {/* Main content */}
                    <div className="p-4 grow overflow-auto">{props.children}</div>

                    {/* Actions */}
                    {props.actions && <div className="flex justify-end mt-4 bg-slate-100 p-4">{props.actions}</div>}

                    {/* Drawer overlay + content */}
                    {props.drawer && (
                        <>
                            {/* Semi-transparent overlay*/}
                            {props.drawer.open && (
                                <div
                                    className="absolute top-0 left-0 w-full h-full bg-black/25 z-10"
                                    onClick={props.drawer.onClose}
                                />
                            )}

                            {/* Drawer content */}
                            <div
                                className={resolveClassNames(
                                    "absolute top-0 left-0 pl-2 h-full bg-white shadow-lg transition-transform duration-300 z-20",
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
