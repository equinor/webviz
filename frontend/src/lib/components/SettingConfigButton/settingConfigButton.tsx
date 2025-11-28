import React from "react";

import { SettingsOutlined } from "@mui/icons-material";

import { Button } from "../Button";
import type { ButtonProps } from "../Button/button";
import { Dialog } from "../Dialog";

export type SettingConfigButtonProps = {
    formTitle: string;
    formContent: React.ReactNode;
    modalWidth?: string;
    modalHeight?: string;
    onOpen?: () => void;
    onClose?: () => void;
    onApply?: () => void;
    onDiscard?: () => void;
} & Omit<ButtonProps, "buttonRef" | "ref" | "onClick">;

function SettingConfigButtonComponent(
    props: SettingConfigButtonProps,
    ref: React.ForwardedRef<HTMLButtonElement>,
): React.ReactNode {
    const { formTitle, size, className, formContent, onOpen, onApply, onDiscard, ...baseProps } = props;

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
            <Button className="mr-4" variant="outlined" onClick={handleCancel}>
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
                className={className}
                buttonRef={ref}
                variant="outlined"
                size={size}
                endIcon={<SettingsOutlined className="ml-auto" fontSize={size} />}
                onClick={handleClick}
                {...baseProps}
            >
                {props.children}
            </Button>

            <Dialog
                modal
                open={modalOpen}
                title={formTitle}
                actions={actions}
                width={props.modalWidth}
                height={props.modalHeight}
            >
                {formContent}
            </Dialog>
        </>
    );
}

export const SettingConfigButton = React.forwardRef(SettingConfigButtonComponent);
