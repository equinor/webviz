import React from "react";

import { SettingsDialogIcon } from "@lib/icons";
import { Button, type ButtonProps } from "@lib/newComponents/Button";
import { Dialog } from "@lib/newComponents/Dialog";

export type SettingConfigButtonProps = {
    formTitle: string;
    formContent: React.ReactNode;
    onOpen?: () => void;
    onClose?: () => void;
    onApply?: () => void;
    onDiscard?: () => void;
} & Omit<ButtonProps, "buttonRef" | "ref" | "onClick">;

function SettingConfigButtonComponent(
    props: SettingConfigButtonProps,
    ref: React.ForwardedRef<HTMLButtonElement>,
): React.ReactNode {
    const { formTitle, size, layoutClassName, formContent, onOpen, onApply, onDiscard, ...baseProps } = props;

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
            <Button variant="text" tone="neutral" onClick={handleCancel}>
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
                {...baseProps}
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
}

export const SettingConfigButton = React.forwardRef(SettingConfigButtonComponent);
