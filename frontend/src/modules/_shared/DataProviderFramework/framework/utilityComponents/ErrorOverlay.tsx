import React from "react";

import { Button } from "@lib/components/Button";
import { Dialog } from "@lib/components/Dialog";
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
            <div className="absolute z-20 inset-0 bg-red-100/80 h-full w-full flex flex-col gap-2 p-4 overflow-hidden items-center justify-center">
                <Button onClick={() => setDialogOpen(true)} variant="contained" size="small" color="danger">
                    Error loading - click for details
                </Button>
            </div>
        </>
    );
}
