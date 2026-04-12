import type { DialogPopupProps } from "@base-ui/react";
import { Dialog as DialogBase } from "@base-ui/react";
import { AlertDialogProps } from "@lib/newComponents/AlertDialog";
import React from "react";

export type PopupProps = {
    children?: React.ReactNode;
    /** If `open` is provided, the component operates in a controlled manner, and the open state is determined by the parent component.*/
    open?: boolean;
    /** If `defaultOpen` is provided without `open`, the component operates in an uncontrolled manner, and the initial open state is determined by `defaultOpen`. */
    defaultOpen?: boolean;
    /** Callback fired when the open state of the dialog changes. Receives the new open state as an argument. */
    onOpenChange?: (open: boolean) => void;
    /** Width of the dialog. Can be a number (pixels) or a string (e.g., "50%"). */
    width?: number | string;
    /** Height of the dialog. Can be a number (pixels) or a string (e.g., "50%"). */
    height?: number | string;
    /** If `modal` is true, the dialog will block interaction with the rest of the application until it is closed. */
    modal?: boolean;
    /** Keeps the dialog mounted in the DOM even when it's closed. Useful for maintaining state or avoiding re-renders. */
    keepMounted?: boolean;
    /** Initial focus element when the dialog opens. False to disable initial focus. True to use default. */
    initialFocus?: DialogPopupProps["initialFocus"];
    /** Array of alert dialogs to be rendered within the popup. */
    alertDialogs?: React.ReactElement<AlertDialogProps>[];
};

const DEFAULT_PROPS = {
    open: false,
    defaultOpen: false,
    keepMounted: false,
} satisfies Partial<PopupProps>;

export function Popup(props: PopupProps) {
    const defaultedProps = { ...DEFAULT_PROPS, ...props };
    return (
        <DialogBase.Root
            open={defaultedProps.open}
            onOpenChange={defaultedProps.onOpenChange}
            modal={defaultedProps.modal}
            defaultOpen={defaultedProps.defaultOpen}
        >
            <DialogBase.Portal keepMounted={defaultedProps.keepMounted}>
                <DialogBase.Backdrop className="dialog__backdrop" />
                <DialogBase.Popup
                    className="dialog__popup"
                    style={{ width: defaultedProps.width, height: defaultedProps.height }}
                >
                    {defaultedProps.children}
                </DialogBase.Popup>
            </DialogBase.Portal>
            {defaultedProps.alertDialogs}
        </DialogBase.Root>
    );
}
