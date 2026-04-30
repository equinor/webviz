import React from "react";

import { type ConfirmActionColor, type ConfirmOptions, ConfirmationService } from "@framework/ConfirmationService";
import type { ButtonProps } from "@lib/components/Button/newButton";
import { AlertDialog } from "@lib/newComponents/AlertDialog";

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

    return (
        <AlertDialog
            open
            primaryAction={{
                label: options.actions[0].label,
                tone: mapActionColorToButtonTone(options.actions[0].color),
                onClick: () => handleAction(options.actions[0].id),
            }}
            secondaryActions={options.actions.slice(1).map((action) => ({
                label: action.label,
                tone: mapActionColorToButtonTone(action.color),
                onClick: () => handleAction(action.id),
            }))}
            title={options.title}
            description={options.message}
        />
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
