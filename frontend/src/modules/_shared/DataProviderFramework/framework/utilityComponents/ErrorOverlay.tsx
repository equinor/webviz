import React from "react";

import { Dialog } from "@lib/components/Dialog";
import { Button } from "@lib/newComponents/Button";
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
            <Dialog
                title={`${props.itemDelegate.getName()} - Persisted values could not be applied`}
                open={dialogOpen}
                modal
                variant="error"
                showCloseCross
                actions={
                    <Button onClick={acceptDeserializationErrors} variant="contained">
                        Confirm and load anyways
                    </Button>
                }
                onClose={() => setDialogOpen(false)}
            >
                <div className="overflow-auto">
                    <ul className="list-disc pl-4">
                        {deserializationErrors.map((error, index) => (
                            <li key={index}>{error}</li>
                        ))}
                    </ul>
                </div>
            </Dialog>
            <div className="absolute inset-0 z-20 flex h-full w-full flex-col items-center justify-center gap-2 overflow-hidden bg-red-100/80 p-4">
                <Button onClick={() => setDialogOpen(true)} variant="contained" size="small" tone="danger">
                    Error loading - click for details
                </Button>
            </div>
        </>
    );
}
