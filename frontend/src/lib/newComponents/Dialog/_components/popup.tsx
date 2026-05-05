import type React from "react";

import type { DialogPopupProps, DialogRootProps } from "@base-ui/react";
import { Dialog as DialogBase } from "@base-ui/react";

import type { AlertDialogProps } from "@lib/newComponents/AlertDialog";

export type PopupProps = {
    children?: React.ReactNode;
    /** Width of the dialog. Can be a number (pixels) or a string (e.g., "50%"). */
    width?: number | string;
    /** Height of the dialog. Can be a number (pixels) or a string (e.g., "50%"). */
    height?: number | string;
    /** Keeps the dialog mounted in the DOM even when it's closed. Useful for maintaining state or avoiding re-renders. */
    keepMounted?: boolean;
    /** Array of alert dialogs to be rendered within the popup. */
    alertDialogs?: React.ReactElement<AlertDialogProps>[];
} & Pick<DialogRootProps, "defaultOpen" | "open" | "onOpenChange" | "modal"> &
    Pick<DialogPopupProps, "initialFocus" | "finalFocus">;

export function Popup(props: PopupProps) {
    const { open = false, defaultOpen = false, keepMounted = false } = props;

    // The "dialog__*" classes can be found in the dialog.css file in the styles/components folder
    return (
        <DialogBase.Root open={open} onOpenChange={props.onOpenChange} modal={props.modal} defaultOpen={defaultOpen}>
            <DialogBase.Portal keepMounted={keepMounted}>
                <DialogBase.Backdrop className="dialog__backdrop" />
                <DialogBase.Popup
                    className="dialog__popup z-modal"
                    style={{ width: props.width, height: props.height }}
                    initialFocus={props.initialFocus}
                    finalFocus={props.finalFocus}
                >
                    {props.children}
                </DialogBase.Popup>
            </DialogBase.Portal>
            {props.alertDialogs}
        </DialogBase.Root>
    );
}
