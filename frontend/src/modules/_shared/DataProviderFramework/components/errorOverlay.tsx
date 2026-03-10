import { Button } from "@lib/components/Button";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import { ItemDelegateTopic, type ItemDelegate } from "../delegates/ItemDelegate";

export type ErrorOverlayProps = {
    itemDelegate: ItemDelegate;
};

export function ErrorOverlay(props: ErrorOverlayProps) {
    const deserializationErrors = usePublishSubscribeTopicValue(
        props.itemDelegate,
        ItemDelegateTopic.DESERIALIZATION_ERRORS,
    );

    if (deserializationErrors.length === 0) {
        return null;
    }

    function acceptDeserializationErrors() {
        props.itemDelegate.clearDeserializationErrors();
    }

    return (
        <div className="absolute z-20 inset-0 bg-orange-100/80 h-full w-full flex flex-col gap-2 p-4">
            <div className="text-orange-700 font-bold">Error loading item</div>
            <div className="overflow-auto">
                <ul className="list-disc list-inside text-orange-700">
                    {deserializationErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                    ))}
                    <li>test</li>
                    <li>test</li>
                    <li>test</li>
                    <li>test</li>
                    <li>test</li>
                    <li>test</li>
                    <li>test</li>
                    <li>test</li>
                    <li>test</li>
                    <li>test</li>
                    <li>test</li>
                    <li>test</li>
                    <li>test</li>
                    <li>test</li>
                </ul>
            </div>
            <Button onClick={acceptDeserializationErrors} variant="contained" size="small">
                Accept and continue
            </Button>
        </div>
    );
}
