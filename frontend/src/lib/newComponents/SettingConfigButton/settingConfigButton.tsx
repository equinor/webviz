import React from "react";

import { SettingsDialogIcon } from "@lib/icons";
import { Button, type ButtonProps } from "@lib/newComponents/Button";
import { Dialog } from "@lib/newComponents/Dialog";

export type SettingConfigButtonProps = {
    /** The title shown in the modal dialog header. */
    formTitle: string;
    /** The content rendered inside the modal dialog body. */
    formContent: React.ReactNode;
    /** Called when the modal dialog opens. */
    onOpen?: () => void;
    /** Called when the modal dialog closes. */
    onClose?: () => void;
    /** Called when the user clicks Apply. */
    onApply?: () => void;
    /** Called when the user clicks Cancel. */
    onDiscard?: () => void;
} & Omit<ButtonProps, "buttonRef" | "ref" | "onClick">;

export const SettingConfigButton = React.forwardRef<HTMLButtonElement, SettingConfigButtonProps>(function SettingConfigButton(props, ref): React.ReactNode {
    const { formTitle, size, layoutClassName, formContent, onOpen, onApply, onDiscard, ...restProps } = props;

    const [modalOpen, setModalOpen] = React.useState(false);

    function handleClick() {
        onOpen?.();
        setModalOpen(true);
    }

    function handleCancel() {
        onDiscard?.();
        setModalOpen(false);
    }

    function handleApply() {
        onApply?.();
        setModalOpen(false);
    }

    const actions = (
        <>
            <Button variant="ghost" tone="neutral" onClick={handleCancel}>
                Cancel
            </Button>
            <Button variant="contained" onClick={handleApply}>
                Apply
            </Button>
        </>
    );

    return (
        <>
            <Button
                layoutClassName={layoutClassName}
                ref={ref}
                variant="outlined"
                size={size}
                tone="neutral"
                onClick={handleClick}
                {...restProps}
            >
                {props.children}
                <SettingsDialogIcon className="ml-auto" size={16} />
            </Button>

            <Dialog.Popup open={modalOpen} onOpenChange={handleCancel} modal>
                <Dialog.Header closeIconVisible>
                    <Dialog.Title>{formTitle}</Dialog.Title>
                </Dialog.Header>
                <Dialog.Body>{formContent}</Dialog.Body>
                <Dialog.Actions>{actions}</Dialog.Actions>
            </Dialog.Popup>
        </>
    );
});
