import React from "react";

import { type ConfirmOptions, ConfirmationService } from "@framework/ConfirmationService";
import { Button } from "@lib/components/Button";
import { Dialog } from "@lib/components/Dialog";

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
        <Dialog
            open
            modal
            showCloseCross={false}
            title={options.title}
            variant={options.variant}
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
            zIndex={101}
        >
            {options.message}
        </Dialog>
    );
}
