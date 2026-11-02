import React from "react";

import { type ConfirmActionColor, type ConfirmOptions, ConfirmationService } from "@framework/ConfirmationService";
import { AlertDialog } from "@lib/components/AlertDialog";
import type { ButtonProps } from "@lib/components/Button";

export function GlobalConfirmationDialog(): React.ReactNode {
    const [visible, setVisible] = React.useState<boolean>(false);
    const [options, setOptions] = React.useState<ConfirmOptions<any>>();

    React.useEffect(function onMount() {
        ConfirmationService.setShowDialogCallback((options) => {
            setOptions(options);
            setVisible(true);
        });
    }, []);

    function handleAction(actionId: string) {
        ConfirmationService.resolve(actionId);
        setVisible(false);
    }

    if (!visible || !options) {
        return null;
    }

    // Actions are listed in visual left-to-right order; the last one is the primary action
    const primaryAction = options.actions[options.actions.length - 1];
    // For destructive confirmations, focus the least destructive action (cancel) so Enter does not confirm by accident
    const focusCancel = primaryAction.color === "danger";

    return (
        <AlertDialog
            open
            primaryAction={{
                label: primaryAction.label,
                tone: mapActionColorToButtonTone(primaryAction.color),
                onClick: () => handleAction(primaryAction.id),
            }}
            secondaryActions={options.actions.slice(0, -1).map((action) => ({
                label: action.label,
                tone: mapActionColorToButtonTone(action.color),
                onClick: () => handleAction(action.id),
                autoFocus: focusCancel && action.id === "cancel",
            }))}
            title={options.title}
        >
            {options.message}
        </AlertDialog>
    );
}

function mapActionColorToButtonTone(color: ConfirmActionColor | undefined): ButtonProps["tone"] {
    switch (color) {
        case "primary":
            return "accent";
        case "danger":
            return "danger";
        case "secondary":
            return "neutral";
        default:
            return "accent";
    }
}
