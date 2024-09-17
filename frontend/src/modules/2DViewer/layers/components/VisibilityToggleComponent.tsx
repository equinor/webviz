import { Visibility, VisibilityOff } from "@mui/icons-material";

import { usePublishSubscribeTopicValue } from "../PublishSubscribeHandler";
import { ItemDelegateTopic } from "../delegates/ItemDelegate";
import { Item } from "../interfaces";

export type VisibilityToggleComponentProps = {
    item: Item;
};

export function VisibilityToggleComponent(props: VisibilityToggleComponentProps): React.ReactNode {
    const isVisible = usePublishSubscribeTopicValue(props.item.getItemDelegate(), ItemDelegateTopic.VISIBILITY);

    function handleToggleLayerVisibility() {
        props.item.getItemDelegate().setIsVisible(!isVisible);
    }

    return (
        <div
            className="hover:cursor-pointer rounded hover:text-blue-600"
            onClick={handleToggleLayerVisibility}
            title="Toggle visibility"
        >
            {isVisible ? <Visibility fontSize="inherit" /> : <VisibilityOff fontSize="inherit" />}
        </div>
    );
}
