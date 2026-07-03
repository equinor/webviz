import React from "react";

import { Button, type ButtonProps } from "@lib/components/Button";
import { Dialog } from "@lib/components/Dialog";
import { SettingsDialogIcon } from "@lib/icons";

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

export const SettingConfigButton = React.forwardRef<HTMLButtonElement, SettingConfigButtonProps>(
    function SettingConfigButton(props, ref): React.ReactNode {
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
                <div className={layoutClassName}>
                    <Button
                        ref={ref}
                        variant="outlined"
                        size={size}
                        tone="neutral"
                        onClick={handleClick}
                        layoutClassName="w-full"
                        {...restProps}
                    >
                        <span className="min-w-0 flex-1 truncate">{props.children}</span>
                        <SettingsDialogIcon className="ml-auto" size={16} />
                    </Button>
                </div>

                <Dialog.Popup open={modalOpen} onOpenChange={handleCancel} modal>
                    <Dialog.Header closeIconVisible>
                        <Dialog.Title>{formTitle}</Dialog.Title>
                    </Dialog.Header>
                    <Dialog.Body>{formContent}</Dialog.Body>
                    <Dialog.Actions>{actions}</Dialog.Actions>
                </Dialog.Popup>
            </>
        );
    },
);
