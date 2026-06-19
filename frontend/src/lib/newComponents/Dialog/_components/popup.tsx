import React from "react";

import type { DialogPopupProps, DialogRootProps } from "@base-ui/react";
import { Dialog as DialogBase } from "@base-ui/react";

import { AlertDialogNestingContext } from "../../../contexts/alertDialogNestingContext";
import { PortalContainerContext } from "../../_shared/contexts/portalContainerContext";

export type PopupProps = {
    /** The content rendered inside the dialog. */
    children?: React.ReactNode;
    /** Width of the dialog. Can be a number (pixels) or a string (e.g., "50%"). */
    width?: number | string;
    /** Height of the dialog. Can be a number (pixels) or a string (e.g., "50%"). */
    height?: number | string;
    /** Minimum width of the dialog. Can be a number (pixels) or a string (e.g., "300px"). */
    minWidth?: number | string;
    /** Minimum height of the dialog. Can be a number (pixels) or a string (e.g., "200px"). */
    minHeight?: number | string;
    /** Keeps the dialog mounted in the DOM even when it's closed. Useful for maintaining state or avoiding re-renders. */
    keepMounted?: boolean;
    /**
     * When true, suppresses the backdrop and replaces the scale animation with a fade for dialogs that
     * stack directly on top of another dialog at the same position. Prevents the distracting
     * "push-forward/push-back" effect that occurs with same-size overlapping dialogs.
     */
    stacked?: boolean;
} & Pick<DialogRootProps, "defaultOpen" | "open" | "onOpenChange" | "modal"> &
    Pick<DialogPopupProps, "initialFocus" | "finalFocus">;

export function Popup(props: PopupProps) {
    const { open = false, defaultOpen = false, keepMounted = false, stacked = false } = props;
    const [popupContainer, setPopupContainer] = React.useState<HTMLElement | null>(null);
    const { openCount } = React.useContext(AlertDialogNestingContext);

    React.useEffect(
        function applyAlertNestingClass() {
            if (!popupContainer) return;
            if (open && openCount > 0) {
                popupContainer.classList.add("dialog__popup--alert-open");
            } else {
                popupContainer.classList.remove("dialog__popup--alert-open");
            }
        },
        [popupContainer, open, openCount],
    );

    // The "dialog__*" classes can be found in the dialog.css file in the styles/components folder
    return (
        <DialogBase.Root open={open} onOpenChange={props.onOpenChange} modal={props.modal} defaultOpen={defaultOpen}>
            <DialogBase.Portal keepMounted={keepMounted}>
                <DialogBase.Backdrop className="dialog__backdrop" />
                <DialogBase.Popup
                    ref={setPopupContainer}
                    className={`dialog__popup z-modal flex flex-col${stacked ? " dialog__popup--stacked" : ""}`}
                    style={{
                        width: props.width,
                        height: props.height,
                        minWidth: props.minWidth,
                        minHeight: props.minHeight,
                    }}
                    initialFocus={props.initialFocus}
                    finalFocus={props.finalFocus}
                >
                    <PortalContainerContext.Provider value={popupContainer ?? undefined}>
                        {props.children}
                    </PortalContainerContext.Provider>
                </DialogBase.Popup>
            </DialogBase.Portal>
        </DialogBase.Root>
    );
}
