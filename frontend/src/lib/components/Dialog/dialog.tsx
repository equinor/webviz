import React from "react";

import { Close } from "@mui/icons-material";

import { createPortal } from "@lib/utils/createPortal";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type DialogDrawerProps = {
    content: React.ReactNode;
    width: string | number;
    open: boolean;
    onClose: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
};

export type DialogProps = {
    title?: string;
    children?: React.ReactNode;
    modal?: boolean;
    open?: boolean;
    onClose?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
    width?: string | number;
    height?: string | number;
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
                className="fixed left-1/2 top-1/2 border rounded-sm bg-white shadow-sm min-w-lg max-w-[75vw] pointer-events-auto flex flex-col"
                style={{
                    transform: `translate(-50%, -50%)`,
                    height: props.height,
                    width: props.width,
                    minWidth: props.minWidth,
                    minHeight: props.minHeight,
                }}
            >
                {/* Header */}
                <div className="flex justify-between p-4 border-b shadow-inner">
                    <h2 className="text-slate-800 font-bold text-lg">{props.title}</h2>
                    {props.showCloseCross && (
                        <div
                            className="hover:text-slate-500 cursor-pointer ml-4"
                            onPointerDown={handleClose}
                            title="Close dialog"
                        >
                            <Close width={24} />
                        </div>
                    )}
                </div>

                {/* Main content */}
                <div className="p-4 grow overflow-auto">{props.children}</div>

                {/* Actions */}
                {props.actions && <div className="flex justify-end mt-4 bg-slate-100 p-4">{props.actions}</div>}

                {/* Drawer overlay */}
                {props.drawer && (
                    <div className={resolveClassNames({ hidden: !props.drawer.open })}>
                        {/* Semi-transparent background */}
                        <div
                            className="absolute top-0 left-0 w-full h-full bg-black/25 z-10"
                            onClick={props.drawer.onClose}
                        />

                        {/* Drawer content */}
                        <div
                            className="absolute top-0 left-0 h-full bg-white shadow-lg z-20"
                            style={{
                                width: props.drawer.width,
                                maxWidth: "99%", // Set to 99% to allow background click
                            }}
                        >
                            {props.drawer.content}
                        </div>
                    </div>
                )}
            </div>
        </div>,
    );
};
