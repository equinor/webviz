import React from "react";

import { AlertDialog } from "@lib/components/AlertDialog/alertDialog";
import { Button } from "@lib/components/Button";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import { ItemDelegateTopic, type ItemDelegate } from "../../delegates/ItemDelegate";

export type ErrorOverlayProps = {
    itemDelegate: ItemDelegate;
    isExpanded: boolean;
};

export function ErrorOverlay(props: ErrorOverlayProps) {
    const [dialogOpen, setDialogOpen] = React.useState(false);

    const deserializationErrors = usePublishSubscribeTopicValue(
        props.itemDelegate,
        ItemDelegateTopic.DESERIALIZATION_ERRORS,
    );

    if (deserializationErrors.length === 0 || !props.isExpanded) {
        return null;
    }

    function acceptDeserializationErrors() {
        props.itemDelegate.clearDeserializationErrors();
        setDialogOpen(false);
    }

    return (
        <>
            <AlertDialog
                title={`${props.itemDelegate.getName()} - Persisted values could not be applied`}
                open={dialogOpen}
                primaryAction={{
                    label: "Acknowledge and clear errors",
                    onClick: acceptDeserializationErrors,
                }}
                secondaryActions={[
                    {
                        label: "Cancel",
                        onClick: () => setDialogOpen(false),
                    },
                ]}
            >
                <div className="overflow-auto">
                    <ul className="pl-lg list-disc">
                        {deserializationErrors.map((error, index) => (
                            <li key={index}>{error}</li>
                        ))}
                    </ul>
                </div>
            </AlertDialog>
            <div className="z-overlay gap-2xs bg-danger/80 p-xs absolute inset-0 flex h-full w-full flex-col items-center justify-center overflow-hidden">
                <Button onClick={() => setDialogOpen(true)} variant="contained" size="small" tone="danger">
                    Error loading - click for details
                </Button>
            </div>
        </>
    );
}
