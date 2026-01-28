import React from "react";

import { ClickAwayListener } from "@mui/base";
import { Close, Help as HelpIcon } from "@mui/icons-material";

import { DenseIconButton } from "@lib/components/DenseIconButton";
import { createPortal } from "@lib/utils/createPortal";

export type ContextHelpProps = {
    title: string;
    content: React.ReactNode;
};

export function ContextHelp(props: ContextHelpProps) {
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
                <HelpIcon fontSize="inherit" color="info" />
            </DenseIconButton>
            {dialogContent && createPortal(dialogContent)}
        </>
    );
}
