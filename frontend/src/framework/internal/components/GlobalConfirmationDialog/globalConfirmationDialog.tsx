import React from "react";

import { type ConfirmOptions, confirmationService } from "@framework/ConfirmationService";
import { Button } from "@lib/components/Button";
import { Dialog } from "@lib/components/Dialog";

export function GlobalConfirmationDialog(): React.ReactNode {
    const [visible, setVisible] = React.useState<boolean>(false);
    const [options, setOptions] = React.useState<ConfirmOptions<any>>();

    React.useEffect(function onMount() {
        confirmationService.setShowDialogCallback((options) => {
            setOptions(options);
            setVisible(true);
        });
    }, []);

    function handleAction(actionId: string) {
        confirmationService.resolve(actionId);
        setVisible(false);
    }

    if (!visible || !options) {
        return null;
    }

    return (
        <Dialog
            open
            modal
            showCloseCross={false}
            title={options.title}
            actions={
                <>
                    {options.actions.map((action) => (
                        <Button
                            key={action.id}
                            color={action.color ?? "primary"}
                            onClick={() => handleAction(action.id)}
                        >
                            {action.label}
                        </Button>
                    ))}
                </>
            }
        >
            {options.message}
        </Dialog>
    );
}
