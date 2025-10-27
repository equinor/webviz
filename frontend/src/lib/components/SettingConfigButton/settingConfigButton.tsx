import React from "react";

import { SettingsOutlined } from "@mui/icons-material";

import { Button } from "../Button";
import type { ButtonProps } from "../Button/button";
import { SubSettings } from "../../../framework/components/SubSettings";

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
    // NOTE: We do not extract props in order to keep an overview over what are internal and external variables
    const { formTitle, size, className, formContent, onOpen, onApply, onDiscard, ...baseProps } = props;

    const buttonRef = React.useRef<HTMLDivElement>(null);

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
                ref={buttonRef}
                variant="outlined"
                size={size}
                endIcon={<SettingsOutlined className="ml-auto" fontSize={size} />}
                onClick={handleClick}
                {...baseProps}
            >
                {props.children}
            </Button>

            <SubSettings
                title="Plot settings"
                anchorElement={buttonRef}
                isOpen={modalOpen}
                onClose={handleCancel}
                width={300}
            >
                {formContent}
            </SubSettings>
        </>
    );
}

export const SettingConfigButton = React.forwardRef(SettingConfigButtonComponent);
